// End-to-end checks of the AI Assistant backend against a local deployment, with
// a scripted fake model and a fake GitHub (fake-services.mjs). They never call a
// real provider or the real repo. See tests/ai/README.md.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi as api } from 'convex/server';

const { TEST_EMAIL: email, TEST_PASSWORD: password } = process.env;
const FAKE = 'http://127.0.0.1:4599';
const anon = new ConvexHttpClient('http://127.0.0.1:3210');
const c = new ConvexHttpClient('http://127.0.0.1:3210');
const only = process.argv[2];

const control = (path, body = {}) =>
  fetch(`${FAKE}/control/${path}`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
const script = (steps) => control('script', { script: steps });
const live = () => anon.query(api.content.siteContent, {});
const later = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(what, fn, ms = 30000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await later(150);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

const draftOf = (threadId) => c.query(api.ai.chat.draft, { threadId });
const inState = (threadId, ...states) =>
  until(`draft in ${states}`, async () => {
    const d = await draftOf(threadId);
    return d && states.includes(d.status) && !(d.status === 'drafting' && d.running) ? d : null;
  });
const say = async (prompt, threadId) => c.mutation(api.ai.chat.send, { prompt, ...(threadId ? { threadId } : {}) });
const toolResults = (call) => JSON.stringify(call.messages.filter((m) => m.role === 'user').map((m) => m.content));
const rejects = async (fn, pattern) => {
  await assert.rejects(fn, (e) => {
    const text = String(e.data ?? e.message);
    assert.match(text, pattern);
    return true;
  });
};
const spent = async () => (await c.query(api.ai.usage.meter, {})).spentUsd;

// A 1x1 PNG, stored the way the CMS stores pictures.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
async function upload() {
  const url = await c.mutation(api.images.generateUploadUrl, {});
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: PNG });
  const { storageId } = await res.json();
  return c.mutation(api.images.create, { variants: [{ width: 1, storageId }], width: 1, height: 1 });
}
const wouldClean = () => {
  const out = execFileSync('npx', ['convex', 'run', 'images:cleanupUnused', '{"keepNewerThanMs":0,"dryRun":true}'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first', CONVEX_AGENT_MODE: 'anonymous' },
  });
  return JSON.parse(out);
};
const describe = (summary, extra = {}) => ['describe_change', { summary, ...extra }];
const OK = { tools: [['approve', {}]] };
const DONE = { text: 'Done.' };

const tests = {
  async 'browser access: everything needs a session, and keys never come back'() {
    await rejects(() => anon.query(api.ai.settings.get, {}), /session/i);
    await rejects(() => anon.mutation(api.ai.chat.send, { prompt: 'hi' }), /session/i);
    await rejects(() => anon.query(api.ai.preview.siteContentPreview, {}), /session/i);
    await rejects(() => anon.mutation(api.ai.versions.rollback, { versionId: 'x' }), /./);
    const s = await c.query(api.ai.settings.get, {});
    const text = JSON.stringify(s);
    assert.ok(!text.includes('sk-ant-fake') && !text.includes('ciphertext'), 'settings leak the key');
    assert.equal(s.providers.find((p) => p.name === 'anthropic').last4, '1234');
  },

  async 'content path: draft stays private until Publish, then rolls back'() {
    const NEW = `Edited by the agent ${Date.now()}`;
    const before = await live();
    const item = before.news[0];
    await script([
      { tools: [['get_site_content', { table: 'news', query: item.title.slice(0, 8) }]] },
      { tools: [['update_record', { table: 'news', id: item.id, field: 'title', value: NEW }], describe('Changed the headline', { page: '/news', text: NEW })] },
      DONE,
      OK,
    ]);
    const { threadId, changeSetId } = await say('Rename the first news post');
    const d = await inState(threadId, 'ready');
    assert.equal(d.contentOps.length, 1);
    assert.equal(d.changeList.length, 1);

    const { calls } = await control('state');
    assert.equal(calls.length, 4, 'one model call per step');
    assert.equal(calls[0].key, 'sk-ant-fake-key-1234');
    assert.ok(toolResults(calls[1]).includes('tool_result'), 'the next step sees the earlier tool result');
    assert.ok(calls[2].messages.length > calls[1].messages.length, 'progress carries over between scheduled steps');
    assert.ok(calls.every((x) => !['any', 'tool'].includes(x.tool_choice?.type)), 'forced tool choice is rejected by current models');
    assert.ok(calls[3].tools.includes('approve') && !calls[3].tools.includes('edit_file'), 'the reviewer can only read and judge');
    assert.ok(calls[3].messages[0].content[0].text.includes(NEW), 'the reviewer sees the edit');
    assert.ok(!JSON.stringify(calls.map((x) => [x.system, x.messages])).includes('sk-ant-fake'), 'a provider key reached the model');

    assert.equal((await live()).news[0].title, item.title, 'live content changed before Publish');
    const preview = await c.query(api.ai.preview.siteContentPreview, { changeSetId });
    assert.equal(preview.news.find((n) => n.id === item.id).title, NEW);

    await c.mutation(api.ai.publish.publish, { changeSetId });
    assert.equal((await live()).news.find((n) => n.id === item.id).title, NEW);
    assert.equal((await draftOf(threadId)).status, 'published');

    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
    assert.equal((await live()).news.find((n) => n.id === item.id).title, item.title);
    const [newest, old] = await c.query(api.ai.versions.list, {});
    assert.ok(newest.isRollback && old.rolledBack);
    await rejects(() => c.mutation(api.ai.versions.rollback, { versionId: version.id }), /already/);

    const log = await c.query(api.ai.audit.list, { changeSetId });
    for (const action of ['prompt', 'tool.update_record', 'model.editor', 'model.reviewer', 'review.approved', 'publish', 'rollback']) {
      assert.ok(log.some((row) => row.action === action), `audit log has ${action}`);
    }
    assert.ok(log.some((row) => row.action === 'model.editor' && row.costUsd > 0), 'audit log has the cost');
  },

  async 'the agent only changes data: it has no code or GitHub tools'() {
    await script([{ text: 'A developer has to do that.' }]);
    const { threadId, changeSetId } = await say('Make the button red');
    await inState(threadId, 'drafting');
    const { calls } = await control('state');
    const tools = calls[0].tools;
    for (const name of ['update_site_text', 'update_record', 'delete_record', 'describe_change']) assert.ok(tools.includes(name), `missing ${name}`);
    for (const name of ['edit_file', 'create_file', 'delete_file', 'read_file', 'search_code']) assert.ok(!tools.includes(name), `still has ${name}`);
    assert.ok(/can't change the site's code/.test(JSON.stringify(calls[0].system)), 'it is told to send those to a developer');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'requests fit what current Claude models accept'() {
    const item = (await live()).news[0];
    // Opus 5.5 always thinks: thinking blocks must go back unchanged between tool
    // steps, and sampling parameters are a 400.
    await script([
      { thinking: 'sig-abc-123', tools: [['get_site_content', { table: 'news', id: item.id }]] },
      { thinking: 'sig-def-456', text: undefined, tools: [['get_site_content', { table: 'gallery' }]] },
      DONE,
    ]);
    const { threadId, changeSetId } = await say('Just look');
    await inState(threadId, 'drafting');
    const { calls } = await control('state');
    assert.equal(calls.length, 3);
    for (const call of calls) {
      for (const key of ['temperature', 'top_p', 'top_k']) assert.ok(!call.bodyKeys.includes(key), `sends ${key}`);
    }
    const history = JSON.stringify(calls[2].messages);
    assert.ok(history.includes('sig-abc-123') && history.includes('sig-def-456'), 'thinking blocks were dropped between steps');
    const roles = calls[2].messages.map((m) => m.role).join(',');
    assert.ok(!/assistant,assistant/.test(roles), `tool steps are out of order: ${roles}`);
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'website text: finds it, drafts it, publishes over the registry, rolls back'() {
    const KEY = 'notFound.hero.title';
    const textOf = (content, key = KEY) => content.text?.find((t) => t.key === key)?.value;
    const draftTo = (value) => ({ tools: [['update_site_text', { key: KEY, value }], describe('Changed the heading', { page: '/page-not-found', text: value ?? 'We couldn' })] });

    await script([{ tools: [['get_site_text', { query: 'find that page' }]] }, draftTo('Lost page'), DONE, OK]);
    let { threadId, changeSetId } = await say('Change the not found heading');
    let d = await inState(threadId, 'ready');
    assert.deepEqual(d.contentOps[0], { op: 'text', key: KEY, from: null, to: 'Lost page' });
    const { calls } = await control('state');
    assert.ok(toolResults(calls[1]).includes(KEY), 'search finds the key from the words on the page');
    assert.ok(toolResults(calls[1]).includes('Page not found'), 'and says which page it is on');
    assert.ok(calls[3].messages[0].content[0].text.includes('Lost page'), 'the reviewer sees the edit');

    assert.equal(textOf(await live()), undefined, 'live text changed before Publish');
    const preview = await c.query(api.ai.preview.siteContentPreview, { changeSetId });
    assert.equal(textOf(preview), 'Lost page');

    await c.mutation(api.ai.publish.publish, { changeSetId });
    assert.equal(textOf(await live()), 'Lost page');

    // A second publish over it, then going back to the code's text with null.
    await script([draftTo('Lost again'), DONE, OK]);
    ({ threadId, changeSetId } = await say('Reword it'));
    d = await inState(threadId, 'ready');
    assert.equal(d.contentOps[0].from, 'Lost page');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    await script([draftTo(null), DONE, OK]);
    ({ threadId, changeSetId } = await say('Back to the original'));
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    assert.equal(textOf(await live()), undefined, 'null removes the edit');

    // Rollbacks restore each state: no row, then the earlier value.
    let [newest, previous] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: newest.id });
    assert.equal(textOf(await live()), 'Lost again');
    await c.mutation(api.ai.versions.rollback, { versionId: previous.id });
    assert.equal(textOf(await live()), 'Lost page');
    const list = await c.query(api.ai.versions.list, {});
    const first = list.find((v) => !v.isRollback && !v.rolledBack);
    await c.mutation(api.ai.versions.rollback, { versionId: first.id });
    assert.equal(textOf(await live()), undefined, 'back to the text in the code');
  },

  async 'website text: stops on conflicts with the Site text page, refuses bad keys'() {
    const KEY = 'notFound.hero.desc';
    await script([{ tools: [['update_site_text', { key: KEY, value: 'Agent words' }]] }, DONE, OK]);
    let { threadId, changeSetId } = await say('Change the description');
    await inState(threadId, 'ready');
    await c.mutation(api.siteText.publish, { changes: [{ key: KEY, value: 'Admin words' }] });
    await rejects(() => c.mutation(api.ai.publish.publish, { changeSetId }), /has changed/);
    assert.equal((await live()).text.find((t) => t.key === KEY).value, 'Admin words');
    await c.mutation(api.ai.chat.discard, { changeSetId });

    // A later Site text edit also blocks rolling back over it.
    await script([{ tools: [['update_site_text', { key: KEY, value: 'Agent words' }]] }, DONE, OK]);
    ({ threadId, changeSetId } = await say('Change it again'));
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.siteText.publish, { changes: [{ key: KEY, value: 'Admin again' }] });
    await rejects(() => c.mutation(api.ai.versions.rollback, { versionId: version.id }), /changed after this publish/);
    await c.mutation(api.siteText.publish, { changes: [{ key: KEY, value: null }] });

    await script([
      {
        tools: [
          ['update_site_text', { key: 'no.such.key', value: 'x' }],
          ['update_site_text', { key: 'constructor', value: 'x' }],
          ['update_site_text', { key: '../bad key', value: 'x' }],
          ['update_site_text', { key: KEY, value: 'x'.repeat(5001) }],
        ],
      },
      { text: 'Could not.' },
    ]);
    ({ threadId, changeSetId } = await say('Bad edits'));
    const d = await inState(threadId, 'drafting');
    assert.equal(d.contentOps.length, 0);
    const results = toolResults((await control('state')).calls[1]);
    assert.ok(/no website text called/.test(results) && /not a valid text name/.test(results) && /at most 5000/.test(results), results.slice(0, 400));
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'Site text page backend still works alongside the agent'() {
    await rejects(() => anon.mutation(api.siteText.publish, { changes: [] }), /session/i);
    await c.mutation(api.siteText.publish, { changes: [{ key: 'notFound.hero.home', value: 'Home please' }] });
    assert.equal((await live()).text.find((t) => t.key === 'notFound.hero.home').value, 'Home please');
    await c.mutation(api.siteText.publish, { changes: [{ key: 'notFound.hero.home', value: null }] });
    assert.ok(!(await live()).text.some((t) => t.key === 'notFound.hero.home'));
  },

  async 'prices: the most trusted source wins, and a bad one changes nothing'() {
    const priceOf = async (model) => (await c.query(api.ai.settings.get, {})).priceTable.find((p) => p.model === model);
    await control('feeds', {});
    let result = await c.action(api.ai.prices.refreshNow, {});
    assert.deepEqual(result.failed, []);

    let p = await priceOf('claude-test-official');
    assert.deepEqual([p.inputPerMTok, p.outputPerMTok, p.source], [5, 10, 'official'], 'the price page beats both lists');
    p = await priceOf('claude-test-tier');
    assert.deepEqual([p.inputPerMTok, p.outputPerMTok], [1, 2], 'small prompts pay the lower tier');
    p = await priceOf('claude-test-wrong');
    assert.deepEqual([p.inputPerMTok, p.source], [5, 'agreed'], 'a page price far from both lists is a misread');
    p = await priceOf('gemini-test-official');
    assert.deepEqual([p.inputPerMTok, p.outputPerMTok, p.source], [0.75, 3.75, 'official'], "Google's page is read too");
    p = await priceOf('claude-test-agreed');
    assert.deepEqual([p.inputPerMTok, p.source, p.name], [1, 'agreed', 'Claude Test Agreed'], "two lists agreeing, with the provider's own name");
    p = await priceOf('claude-test-differ');
    assert.deepEqual([p.inputPerMTok, p.outputPerMTok, p.source], [2, 3, 'unconfirmed'], 'lists that differ: the higher, marked');
    p = await priceOf('claude-test-only');
    assert.deepEqual([p.source, p.available], ['unconfirmed', false], "one list only, and this key can't use it");
    for (const model of ['claude-embed-test', 'claude-test-zero', 'claude-test-old', 'claude-test-picture', 'thing', 'claude-test-agreed:batch']) {
      assert.equal(await priceOf(model), undefined, `${model} isn't offered`);
    }
    const headers = await control('feedHeaders');
    assert.ok(headers.length >= 4 && !headers.flat().some((h) => /key|authorization/i.test(h)), 'no API key goes to a price source');

    // A name from outside can't carry markup.
    await control('feeds', { 'openrouter.json': JSON.stringify({ data: [{ id: 'anthropic/claude-test-markup', name: 'Anthropic: <b>x</b>', pricing: { prompt: '0.000001', completion: '0.000002' } }] }) });
    await c.action(api.ai.prices.refreshNow, {});
    assert.equal((await priceOf('claude-test-markup')).name, 'Claude Test Markup');

    // The admin's own price stays through a check.
    await control('feeds', {});
    await c.mutation(api.ai.settings.save, { priceTable: [{ provider: 'anthropic', model: 'claude-test-agreed', inputPerMTok: 9, outputPerMTok: 9 }] });
    await c.action(api.ai.prices.refreshNow, {});
    p = await priceOf('claude-test-agreed');
    assert.deepEqual([p.inputPerMTok, p.source, p.name], [9, 'admin', 'Claude Test Agreed']);
    await c.mutation(api.ai.settings.save, { priceTable: [] });
    assert.equal((await priceOf('claude-test-agreed')).inputPerMTok, 1, 'and goes back to automatic');

    // An unconfirmed jump isn't believed.
    const LLF = (i, o) => ({ litellm_provider: 'anthropic', mode: 'chat', input_cost_per_token: i / 1e6, output_cost_per_token: o / 1e6 });
    await control('feeds', { 'litellm.json': JSON.stringify({ 'claude-opus-5-5': LLF(4, 20), 'claude-test-differ': LLF(100, 200) }) });
    result = await c.action(api.ai.prices.refreshNow, {});
    assert.ok(result.held.includes('claude-test-differ'));
    p = await priceOf('claude-test-differ');
    assert.deepEqual([p.inputPerMTok, p.held], [2, true], 'the last price stays');

    // A source down, or a page whose layout changed: the others carry on, nothing is removed.
    await control('feeds', { 'openrouter.json': null, 'anthropic.md': '<html>Welcome</html>' });
    result = await c.action(api.ai.prices.refreshNow, {});
    assert.deepEqual([...result.failed].sort(), ["Anthropic's price page", 'OpenRouter']);
    assert.ok(await priceOf('claude-test-differ'));
    assert.equal((await priceOf('claude-opus-5-5')).inputPerMTok, 4);
    await control('feeds', { 'openrouter.json': null, 'litellm.json': null, 'anthropic.md': null, 'google.md': null });
    result = await c.action(api.ai.prices.refreshNow, {});
    assert.equal(result.failed.length, 4);
    assert.ok(await priceOf('claude-test-differ'), 'everything down keeps every price');
    assert.equal((await c.query(api.ai.settings.get, {})).priceCheck.failed.length, 4, 'and the settings page can say so');

    // Gone from every source, with all of them answering.
    await control('feeds', { 'litellm.json': JSON.stringify({ 'claude-opus-5-5': LLF(4, 20) }), 'openrouter.json': JSON.stringify({ data: [{ id: 'anthropic/claude-opus-5.5', name: 'Anthropic: Claude Opus 5.5', pricing: { prompt: '0.000004', completion: '0.00002' } }] }) });
    await c.action(api.ai.prices.refreshNow, {});
    assert.equal(await priceOf('claude-test-differ'), undefined);
    await control('feeds', {});
  },

  async 'usage and the log are separate for each model, and add up'() {
    const item = (await live()).news[0];
    await c.mutation(api.ai.settings.save, { editorModel: { provider: 'anthropic', model: 'claude-haiku-5-5' }, reviewerModel: { provider: 'anthropic', model: 'claude-sonnet-5-5' } });
    const before = await spent();
    const NEW = `Split ${Date.now()}`;
    await control('script', { script: [{ tools: [['update_record', { table: 'news', id: item.id, field: 'title', value: NEW }], describe('Rename')] }, DONE, OK] });
    const { threadId, changeSetId } = await say('Rename it');
    await inState(threadId, 'ready');
    assert.ok((await spent()) > before, 'the meter moved');

    await c.mutation(api.ai.settings.save, { editorModel: { provider: 'anthropic', model: 'claude-opus-5-5' }, reviewerModel: { provider: 'anthropic', model: 'claude-opus-5-5' } });
    const { rows, totalUsd } = await c.query(api.ai.usage.summary, {});
    const row = (model, role) => rows.find((r) => r.model === model && r.role === role);
    assert.ok(row('claude-haiku-5-5', 'editor').calls >= 2 && row('claude-sonnet-5-5', 'reviewer').calls >= 1, 'each model and job has its own row');
    assert.equal(row('claude-haiku-5-5', 'editor').name, 'Claude Haiku 5.5', 'with its name');
    assert.ok(Math.abs(totalUsd - (await spent())) < 1e-9, 'the rows add up to the meter');
    assert.ok(Math.abs(rows.reduce((sum, r) => sum + r.costUsd, 0) - totalUsd) < 1e-9);

    const log = (args) => c.query(api.ai.audit.browse, args);
    const editor = await log({ model: 'claude-haiku-5-5' });
    const reviewer = await log({ model: 'claude-sonnet-5-5' });
    assert.ok(editor.rows.some((r) => r.action === 'tool.update_record') && editor.rows.some((r) => r.action === 'model.editor'), "the editor's actions and calls");
    assert.ok(!editor.rows.some((r) => r.action.includes('review')), 'and none of the reviewer\'s');
    assert.ok(reviewer.rows.some((r) => r.action === 'model.reviewer') && reviewer.rows.some((r) => r.action === 'review.approved'), "the reviewer's");
    assert.ok(editor.models.includes('claude-haiku-5-5') && editor.models.includes('claude-sonnet-5-5'), 'the filter lists both');
    const calls = await log({ category: 'models', model: 'claude-haiku-5-5' });
    assert.ok(calls.rows.length > 0 && calls.rows.every((r) => r.category === 'models' && r.model === 'claude-haiku-5-5' && r.costUsd > 0));
    assert.ok(calls.costUsd > 0 && calls.modelCalls === calls.total);
    assert.ok((await log({ category: 'requests' })).rows.every((r) => r.action === 'prompt'));

    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'each step of rollback and undo says what it did'() {
    const item = (await live()).news[0];
    const NEW = `Chain ${Date.now()}`;
    const title = async () => (await live()).news.find((n) => n.id === item.id).title;
    await control('script', { script: [{ tools: [['update_record', { table: 'news', id: item.id, field: 'title', value: NEW }], describe('Rename')] }, DONE, OK] });
    const { threadId, changeSetId } = await say('Rename it');
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const versions = () => c.query(api.ai.versions.list, {});
    const [published] = await versions();
    assert.equal(published.status, 'Live');
    const about = published.summary;

    const first = await c.mutation(api.ai.versions.rollback, { versionId: published.id });
    assert.equal(first.undidRollback, false);
    assert.equal(await title(), item.title);
    let [newest, old] = await versions();
    assert.deepEqual([newest.summary, newest.status, newest.isRollback], [`Rolled back: ${about}`, 'Rollback in effect', true]);
    assert.equal(old.status, 'Rolled back');

    const second = await c.mutation(api.ai.versions.rollback, { versionId: newest.id });
    assert.equal(second.undidRollback, true);
    assert.equal(await title(), NEW, 'the change is back');
    const after = await versions();
    assert.deepEqual([after[0].summary, after[0].status, after[0].isRollback, after[0].rolledBack], [`Put back: ${about}`, 'Live again', false, false], 'a put-back change offers Roll back, not Undo this rollback');
    assert.equal(after[1].status, 'Undone');
    assert.equal(after[2].status, 'Put back later', 'the original publish knows it is live again');
    assert.ok(!after[0].summary.includes('Rolled back: Rolled back'));
    await rejects(() => c.mutation(api.ai.versions.rollback, { versionId: after[1].id }), /already been undone/);
    const log = await c.query(api.ai.audit.list, { changeSetId });
    assert.ok(log.some((r) => r.action === 'rollback.undo'), 'the log says it was an undo');

    await c.mutation(api.ai.versions.rollback, { versionId: after[0].id });
    assert.equal(await title(), item.title);
    const third = await versions();
    assert.deepEqual([third[0].summary, third[0].status], [`Rolled back: ${about}`, 'Rollback in effect']);
    assert.equal(third.find((v) => v.id === published.id).status, 'Rolled back', 'and it follows the last step');
  },

  async 'rollback refuses to overwrite a later edit'() {
    const item = (await live()).startups[0];
    await script([{ tools: [['update_record', { table: 'startups', id: item.id, field: 'name', value: 'Agent Name' }]] }, DONE, OK]);
    const { threadId, changeSetId } = await say('Rename the startup');
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.startups.update, { id: item.id, name: 'Admin Name', description: item.description });
    await rejects(() => c.mutation(api.ai.versions.rollback, { versionId: version.id }), /changed after this publish/);
    assert.equal((await live()).startups.find((s) => s.id === item.id).name, 'Admin Name');
    await c.mutation(api.startups.update, { id: item.id, name: item.name, description: item.description });
  },

  async 'Publish stops when a record changed since the draft'() {
    const item = (await live()).team[0];
    await script([{ tools: [['update_record', { table: 'teamMembers', id: item.id, field: 'role', value: 'Agent Role' }]] }, DONE, OK]);
    const { threadId, changeSetId } = await say('Change the job title');
    await inState(threadId, 'ready');
    await c.mutation(api.team.update, { id: item.id, name: item.name, role: 'Changed Meanwhile', category: item.category, bio: item.bio });
    await rejects(() => c.mutation(api.ai.publish.publish, { changeSetId }), /changed since/);
    assert.equal((await draftOf(threadId)).status, 'ready');
    assert.equal((await live()).team.find((t) => t.id === item.id).role, 'Changed Meanwhile');
    await c.mutation(api.team.update, { id: item.id, name: item.name, role: item.role, category: item.category, bio: item.bio });
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'deletes always wait for the admin, and can be declined or restored'() {
    const target = (await live()).gallery.at(-1);
    await script([{ tools: [['delete_record', { table: 'gallery', id: target.id, reason: 'Asked to remove it' }]] }, { text: 'Waiting.' }]);
    const { threadId, changeSetId } = await say('Delete the oldest photo');
    let d = await inState(threadId, 'needs_admin');
    assert.equal(d.pendingConfirm.id, target.id);
    assert.equal(d.contentOps.length, 0, 'an unconfirmed delete entered the draft');
    await rejects(() => c.mutation(api.ai.publish.publish, { changeSetId, override: true }), /hasn't passed/);
    await rejects(() => say('something else', threadId), /answer the question/);

    await script([{ text: 'Left it alone.' }]);
    await c.mutation(api.ai.chat.answerConfirm, { changeSetId, approve: false });
    d = await inState(threadId, 'drafting');
    assert.equal(d.contentOps.length, 0);
    assert.ok(!d.pendingConfirm);

    await script([{ tools: [['delete_record', { table: 'gallery', id: target.id, reason: 'Asked again' }]] }, { text: 'Waiting.' }]);
    await say('Really delete it', threadId);
    await until('confirm card', async () => (await draftOf(threadId)).pendingConfirm);
    await script([DONE, OK]);
    await c.mutation(api.ai.chat.answerConfirm, { changeSetId, approve: true });
    d = await inState(threadId, 'ready');
    assert.equal(d.contentOps[0].op, 'delete');
    assert.ok((await live()).gallery.some((g) => g.id === target.id), 'deleted before Publish');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    assert.ok(!(await live()).gallery.some((g) => g.id === target.id));
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
    const restored = (await live()).gallery.find((g) => g.subtext === target.subtext && g.image === target.image);
    assert.ok(restored, 'the record and its picture came back');
  },

  async 'review rejects twice automatically, then the admin decides'() {
    const item = (await live()).news[1];
    const edit = (n) => ({ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: `Attempt ${n}` }]] });
    const no = (r) => ({ tools: [['reject', { reasons: [r] }]] });
    await script([edit(1), DONE, no('Too vague'), edit(2), DONE, no('Still vague'), edit(3), DONE, no('Wrong again')]);
    const { threadId, changeSetId } = await say('Improve the summary');
    const d = await inState(threadId, 'needs_admin');
    assert.equal(d.reviewAttempts, 3);
    assert.deepEqual(d.review.reasons, ['Wrong again']);
    const { calls } = await control('state');
    assert.ok(JSON.stringify(calls[3].messages).includes('Too vague'), 'the editor is told why');
    assert.equal((await control('state')).remaining, 0, 'no fourth attempt');
    await rejects(() => c.mutation(api.ai.publish.publish, { changeSetId }), /hasn't passed/);
    await c.mutation(api.ai.publish.publish, { changeSetId, override: true });
    assert.equal((await live()).news.find((n) => n.id === item.id).subtitle, 'Attempt 3');
    const log = await c.query(api.ai.audit.list, { changeSetId });
    assert.ok(log.some((row) => row.action === 'publish.overrideReview'), 'the override is logged');
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
  },

  async 'a review with no verdict is not a pass'() {
    const item = (await live()).news[1];
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Unjudged' }]] }, DONE, { text: 'Looks fine to me.' }]);
    const { threadId, changeSetId } = await say('Edit');
    const d = await inState(threadId, 'needs_admin');
    assert.equal(d.review.verdict, 'rejected');
    await rejects(() => c.mutation(api.ai.publish.publish, { changeSetId }), /hasn't passed/);
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'spend cap stops mid-task, keeps the draft, and carries on when raised'() {
    const item = (await live()).news[2];
    // Each fake call costs $0.008 at the Opus price: room for exactly two.
    await c.mutation(api.ai.settings.save, { monthlyBudgetUsd: (await spent()) + 0.012 });
    const edit = (value) => ({ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value }]] });
    await script([edit('Step one'), edit('Step two'), edit('Step three'), DONE, OK]);
    const { threadId, changeSetId } = await say('A long task');
    const d = await inState(threadId, 'needs_admin');
    assert.match(d.notice, /budget/i);
    assert.equal(d.contentOps[0].to, 'Step two', 'the draft so far is kept');
    assert.equal((await control('state')).remaining, 3, 'no model call after the cap');
    assert.equal((await c.query(api.ai.usage.meter, {})).level, 'blocked');
    await rejects(() => c.mutation(api.ai.publish.publish, { changeSetId }), /hasn't passed/);

    await c.mutation(api.ai.settings.save, { monthlyBudgetUsd: 20 });
    await say('Carry on', threadId);
    const done = await inState(threadId, 'ready');
    assert.equal(done.contentOps[0].to, 'Step three');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'an unpriced model is refused, so the cap can never count it as free'() {
    await c.mutation(api.ai.settings.save, { editorModel: { provider: 'anthropic', model: 'mystery-model' } });
    await script([DONE]);
    const { threadId, changeSetId } = await say('Hello');
    const d = await inState(threadId, 'needs_admin');
    assert.match(d.notice, /no price/);
    assert.equal((await control('state')).calls.length, 0);
    await c.mutation(api.ai.settings.save, { editorModel: { provider: 'anthropic', model: 'claude-opus-5-5' } });
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'a provider error stops the agent and keeps the draft'() {
    const item = (await live()).news[2];
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Kept' }]] }, { status: 400, message: 'bad request from provider' }]);
    const { threadId, changeSetId } = await say('Edit');
    const d = await inState(threadId, 'needs_admin');
    assert.match(d.notice, /provider returned an error/);
    assert.equal(d.contentOps[0].to, 'Kept');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'Stop and discard: a stale step can no longer change the draft'() {
    const item = (await live()).news[2];
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'First' }]] }, { delay: 2500, tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'After stop' }]] }, DONE]);
    const { threadId, changeSetId } = await say('Edit');
    await until('first edit', async () => (await draftOf(threadId)).contentOps.length === 1);
    await c.mutation(api.ai.chat.stop, { changeSetId });
    await later(4000);
    const d = await draftOf(threadId);
    assert.equal(d.status, 'needs_admin');
    assert.equal(d.contentOps[0].to, 'First', 'a step that outlived Stop wrote to the draft');
    assert.ok((await control('state')).remaining >= 1, 'the loop carried on after Stop');
    await c.mutation(api.ai.chat.discard, { changeSetId });
    await rejects(() => c.mutation(api.ai.chat.discard, { changeSetId }), /can't be discarded/);
  },

  async 'a stopped step cannot write, even once a newer run is going'() {
    const item = (await live()).news[2];
    const edit = (value, extra = {}) => ({ ...extra, tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value }]] });
    await script([edit('First'), edit('Stale', { delay: 2500 }), DONE]);
    const { threadId, changeSetId } = await say('Edit');
    await until('first edit', async () => (await draftOf(threadId)).contentOps.length === 1);
    await c.mutation(api.ai.chat.stop, { changeSetId });
    await say('Do something else instead', threadId);
    await inState(threadId, 'ready', 'reviewing', 'drafting', 'needs_admin');
    await later(4500);
    const d = await draftOf(threadId);
    assert.equal(d.contentOps[0]?.to, 'First', 'the stopped step wrote to the draft');
    await c.mutation(api.ai.chat.stop, { changeSetId }).catch(() => undefined);
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'Stop can never reopen a finished draft'() {
    const item = (await live()).news[2];
    const value = `Stop test ${Date.now()}`;
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value }]] }, DONE, OK]);
    const { threadId, changeSetId } = await say('Edit');
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    await c.mutation(api.ai.chat.stop, { changeSetId });
    assert.equal((await draftOf(threadId)).status, 'published');
    await rejects(() => c.mutation(api.ai.publish.publish, { changeSetId, override: true }), /hasn't passed/);
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
  },

  async 'new sections: placed anywhere, previewed, published, moved, removed, rolled back'() {
    const heading = `Our partners ${Date.now()}`;
    const fields = { page: '/summary', after: 'pillars', heading, body: 'First paragraph.\n\nSecond paragraph.', buttonLabel: 'Meet the team', buttonUrl: '/aicteam' };
    await script([
      { tools: [['get_page_sections', { page: '/summary' }]] },
      { tools: [['add_section', fields], describe('Added a section', { page: '/summary', text: heading })] },
      DONE,
      OK,
    ]);
    let { threadId, changeSetId } = await say('Add a section after what we stand for');
    await inState(threadId, 'ready');
    const { calls } = await control('state');
    assert.ok(toolResults(calls[1]).includes('What we stand for'), 'it can see the parts of the page');
    assert.ok(!(await live()).sections.some((s) => s.heading === heading), 'live before Publish');
    const preview = await c.query(api.ai.preview.siteContentPreview, { changeSetId });
    assert.equal(preview.sections.find((s) => s.heading === heading).after, 'pillars');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const added = (await live()).sections.find((s) => s.heading === heading);
    assert.equal(added.button_url, '/aicteam');

    // Refused: places that don't exist.
    await script([
      {
        tools: [
          ['add_section', { page: '/summary', after: 'nowhere', heading: 'x', body: 'x' }],
          ['add_section', { page: '/summary', after: 'hero', heading: 'x', body: 'x', buttonLabel: 'Go', buttonUrl: 'javascript:alert(1)' }],
          ['add_section', { page: '/summary', after: 'hero', heading: 'x', body: 'x', buttonLabel: 'Go', buttonUrl: '//evil.example/phish' }],
          ['add_section', { page: '/summary', after: 'hero', heading: 'x', body: 'x', buttonLabel: 'Go', buttonUrl: '/no-such-page' }],
          ['add_section', { page: '/summary', after: 'hero', heading: 'x', body: 'x', buttonLabel: 'Only a label' }],
          ['update_record', { table: 'pageSections', id: added.id, field: 'after', value: 'nowhere' }],
        ],
      },
      { tools: [['update_record', { table: 'pageSections', id: added.id, field: 'after', value: 'story' }], ['update_record', { table: 'pageSections', id: added.id, field: 'body', value: 'New words' }]] },
      DONE,
      OK,
    ]);
    ({ threadId, changeSetId } = await say('Move it'));
    await inState(threadId, 'ready');
    const results = toolResults((await control('state')).calls[1]);
    assert.equal(results.match(/must be one of/g)?.length, 2, results.slice(0, 500));
    assert.match(results, /must start with https/);
    assert.equal(results.match(/must be a page on this site/g)?.length, 2);
    assert.match(results, /needs both its text and its address/);
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const moved = (await live()).sections.find((s) => s.id === added.id);
    assert.equal(moved.after, 'story');
    assert.equal(moved.body, 'New words');

    // Removing one asks first, and can be undone.
    await script([{ tools: [['delete_record', { table: 'pageSections', id: added.id, reason: 'Asked to' }]] }]);
    ({ threadId, changeSetId } = await say('Remove it'));
    const d = await inState(threadId, 'needs_admin');
    assert.equal(d.pendingConfirm.label, heading);
    await script([DONE, OK]);
    await c.mutation(api.ai.chat.answerConfirm, { changeSetId, approve: true });
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    assert.ok(!(await live()).sections.some((s) => s.id === added.id));
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
    const back = (await live()).sections.find((s) => s.heading === heading);
    assert.equal(back.body, 'New words');
    // Tidy up: the test leaves no section behind.
    await script([{ tools: [['delete_record', { table: 'pageSections', id: back.id, reason: 'Tidy' }]] }]);
    ({ threadId, changeSetId } = await say('Remove it'));
    await inState(threadId, 'needs_admin');
    await script([DONE, OK]);
    await c.mutation(api.ai.chat.answerConfirm, { changeSetId, approve: true });
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
  },

  async 'sections in the same place keep the order they were added, and can be reordered'() {
    const stamp = Date.now();
    const add = (n, after = 'story') => ['add_section', { page: '/summary', after, heading: `Our partners ${stamp} ${n}`, body: 'x' }];
    await script([{ tools: [add('A')] }, { tools: [add('B')] }, { tools: [add('C', 'pillars')] }, { tools: [add('D', 'pillars')] }, DONE, OK]);
    let { threadId, changeSetId } = await say('Add sections');
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const inPlace = async (after) => (await live()).sections.filter((s) => s.heading.includes(String(stamp)) && s.after === after).sort((x, y) => x.created_at.localeCompare(y.created_at));
    const story = await inPlace('story');
    const pillars = await inPlace('pillars');
    assert.deepEqual(story.map((s) => s.heading.at(-1)), ['A', 'B'], 'a later section lands below an earlier one');
    // Two groups reordered in one draft both apply.
    await script([
      { tools: [['reorder', { table: 'pageSections', ids: [story[1].id, story[0].id] }]] },
      { tools: [['reorder', { table: 'pageSections', ids: [pillars[1].id, pillars[0].id] }]] },
      DONE,
      OK,
    ]);
    ({ threadId, changeSetId } = await say('Swap them'));
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    assert.deepEqual((await inPlace('story')).map((s) => s.heading.at(-1)), ['B', 'A']);
    assert.deepEqual((await inPlace('pillars')).map((s) => s.heading.at(-1)), ['D', 'C'], 'the second reorder dropped the first');
    const versions = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: versions[0].id });
    await c.mutation(api.ai.versions.rollback, { versionId: versions[1].id });
    assert.ok(!(await live()).sections.some((s) => s.heading.includes(String(stamp))));
  },

  async 'new people: team, governors and mentors, with no picture needed'() {
    const stamp = Date.now();
    const person = (name, category) => ['add_person', { name, role: 'Advisor', category }];
    await script([
      { tools: [person(`Gov ${stamp}`, 'governor'), person(`Mentor ${stamp}`, 'mentor_india_academic'), person(`Team ${stamp}`, 'team')] },
      { tools: [['add_person', { name: 'x', role: 'y', category: 'team', pictureId: await (async () => (await live()).gallery[0].image.split('/img/')[1])() }]] },
      DONE,
      OK,
    ]);
    const { threadId, changeSetId } = await say('Add these people');
    const d = await inState(threadId, 'ready');
    assert.equal(d.contentOps.length, 3);
    assert.match(toolResults((await control('state')).calls[2]), /only use a picture the admin attached/, 'someone else\'s photo is refused');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const team = (await live()).team;
    assert.equal(team.find((m) => m.name === `Gov ${stamp}`).category_display, 'Board of Governors');
    assert.equal(team.find((m) => m.name === `Mentor ${stamp}`).category, 'mentor_india_academic');
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
    assert.ok(!(await live()).team.some((m) => m.name.endsWith(String(stamp))));
  },

  async 'new startups and news: need a picture, and can use one attached in the chat'() {
    const stamp = Date.now();
    const imageId = await upload();
    const other = (await live()).startups[0].logo_or_image.split('/img/')[1];
    const startup = { name: `name ${stamp}`, description: `description ${stamp}` };
    await script([
      { tools: [['add_startup', { ...startup, pictureId: '' }], ['add_startup', { ...startup, pictureId: other }]] },
      { tools: [['add_startup', { ...startup, websiteUrl: 'https://example.com', altText: 'Logo', pictureId: imageId }], ['add_news', { title: `Title ${stamp}`, content: 'Full story', pictureId: imageId }]] },
      DONE,
      OK,
    ]);
    await assert.rejects(
      c.mutation(api.ai.chat.send, { prompt: 'Four pictures', pictures: [1, 2, 3, 4].map((n) => ({ imageId, name: `${n}.png` })) }),
      /no more than 3 pictures/,
      'the server holds the picture limit too',
    );
    const { threadId, changeSetId } = await c.mutation(api.ai.chat.send, { prompt: 'Add a startup and a news post', pictures: [{ imageId, name: 'logo.png' }] });
    const d = await inState(threadId, 'ready');
    const { calls } = await control('state');
    assert.ok(JSON.stringify(calls[0].messages).includes(imageId), 'the agent is told about the attached picture');
    assert.match(JSON.stringify(calls.at(-1).messages), /What the editing agent told the admin:\\n(?!\(nothing\))/, 'the review sees what the editor told the admin');
    assert.match(toolResults(calls[1]), /needs: logoId\. Ask the admin to attach/, 'no picture is refused');
    assert.match(toolResults(calls[1]), /only use a picture the admin attached/, 'another startup\'s logo is refused');
    assert.equal(d.contentOps.length, 2);
    assert.ok(!wouldClean().includes(imageId), 'cleanup must keep a picture in an open draft');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const site = await live();
    assert.ok(site.startups.find((s) => s.name === `name ${stamp}`).logo_or_image.includes(imageId));
    assert.equal(site.news.find((n) => n.title === `Title ${stamp}`).content, 'Full story');
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
    assert.ok(!(await live()).startups.some((s) => s.name === `name ${stamp}`));
    const stray = await upload();
    assert.ok(wouldClean().includes(stray), 'cleanup still finds unused pictures');
  },

  async 'a deleted record keeps its picture, so a later rollback still has it'() {
    const imageId = await upload();
    const id = await c.mutation(api.gallery.create, { imageId, subtext: `Keep ${Date.now()}` });
    await script([{ tools: [['delete_record', { table: 'gallery', id, reason: 'Asked' }]] }]);
    const { threadId, changeSetId } = await say('Delete it');
    await inState(threadId, 'needs_admin');
    await script([DONE, OK]);
    await c.mutation(api.ai.chat.answerConfirm, { changeSetId, approve: true });
    await inState(threadId, 'ready');
    await c.mutation(api.ai.publish.publish, { changeSetId });
    assert.ok(!wouldClean().includes(imageId), 'cleanup would break the rollback');
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
    const restored = (await live()).gallery.find((g) => g.image.includes(imageId));
    assert.ok(restored, 'the record and picture are back');
    await c.mutation(api.gallery.remove, { id: restored.id });
  },

  async 'contact details and links: edited as data, and bad addresses refused'() {
    const phones = '+91-1111111111\n+91-2222222222';
    await script([
      {
        tools: [
          ['update_site_text', { key: 'contact.phones', value: phones }],
          ['update_site_text', { key: 'links.instagram', value: 'https://instagram.com/new' }],
          ['update_site_text', { key: 'links.facebook', value: 'not a link' }],
          ['update_site_text', { key: 'links.apply', value: 'javascript:alert(1)' }],
          ['update_site_text', { key: 'links.youtube', value: '' }],
          ['update_site_text', { key: 'links.map', value: '' }],
        ],
      },
      DONE,
      OK,
    ]);
    const { threadId, changeSetId } = await say('Update the contact details');
    const d = await inState(threadId, 'ready');
    const results = toolResults((await control('state')).calls[1]);
    assert.equal(results.match(/full web address/g)?.length, 3);
    assert.deepEqual(d.contentOps.map((op) => op.key).sort(), ['contact.phones', 'links.instagram', 'links.youtube']);
    await c.mutation(api.ai.publish.publish, { changeSetId });
    const text = Object.fromEntries((await live()).text.map((t) => [t.key, t.value]));
    assert.equal(text['contact.phones'], phones);
    assert.equal(text['links.instagram'], 'https://instagram.com/new');
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.versions.rollback, { versionId: version.id });
    assert.ok(!(await live()).text.some((t) => t.key === 'contact.phones'));
    // The Site text page goes through the same check.
    await rejects(() => c.mutation(api.siteText.publish, { changes: [{ key: 'links.apply', value: 'www.forms.com/x' }] }), /full web address/);
    await rejects(() => c.mutation(api.siteText.publish, { changes: [{ key: 'links.apply', value: 'javascript:alert(1)' }] }), /full web address/);
    await rejects(() => c.mutation(api.siteText.publish, { changes: [{ key: 'links.apply', value: '' }] }), /full web address/);
  },

  async 'the change list can be corrected'() {
    const item = (await live()).news[2];
    await script([
      { tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Temp' }], describe('Old idea'), describe('Kept idea')] },
      { tools: [['remove_change', { summary: 'Old idea' }], ['remove_change', { summary: 'Never added' }]] },
      DONE,
      OK,
    ]);
    const { threadId, changeSetId } = await say('Edit');
    const d = await inState(threadId, 'ready');
    assert.deepEqual(d.changeList.map((x) => x.summary), ['Kept idea']);
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'Gemini: works with only a Google key, keeps thought signatures, valid tool schemas'() {
    const before = await c.query(api.ai.settings.get, {});
    assert.ok(before.providers.find((p) => p.name === 'google').configured, 'needs a Google key saved in this deployment');
    await c.mutation(api.ai.settings.removeProviderKey, { provider: 'anthropic' });
    try {
      const s = await c.query(api.ai.settings.get, {});
      assert.equal(s.editorModel.provider, 'google', 'follows the only saved key');
      assert.ok(s.priceTable.some((p) => p.provider === 'google' && p.model === s.editorModel.model), 'and it has a price');
      const item = (await live()).news[2];
      await script([
        { signature: 'gem-sig-A', tools: [['get_site_content', { table: 'news' }], ['get_site_text', { query: 'find that page' }]] },
        { signature: 'gem-sig-B', tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'From Gemini' }]] },
        { text: 'Done.' },
        { tools: [['approve', {}]] },
      ]);
      const { threadId, changeSetId } = await say('Edit with Gemini');
      const d = await inState(threadId, 'ready', 'needs_admin');
      assert.equal(d.status, 'ready', d.notice);
      assert.equal(d.contentOps[0].to, 'From Gemini');
      const { calls } = await control('state');
      assert.ok(calls.every((x) => x.provider === 'google' && x.hasKey), 'every call goes to Google');
      const history = JSON.stringify(calls[2].contents);
      assert.ok(history.includes('gem-sig-A') && history.includes('gem-sig-B'), `thought signatures were dropped: ${history.slice(0, 500)}`);
      const declarations = calls[0].tools.flatMap((t) => t.functionDeclarations ?? []);
      assert.ok(declarations.some((f) => f.name === 'update_site_text'));
      const empty = [];
      const visit = (schema, name) => {
        if (!schema || typeof schema !== 'object') return;
        if (schema.type === 'object' && !Object.keys(schema.properties ?? {}).length) empty.push(name);
        Object.values(schema.properties ?? {}).forEach((x) => visit(x, name));
        visit(schema.items, name);
      };
      declarations.forEach((f) => visit(f.parameters, f.name));
      assert.deepEqual(empty, [], 'Gemini rejects object schemas with no properties');
      const log = await c.query(api.ai.audit.list, { changeSetId });
      assert.ok(log.some((row) => row.action === 'model.editor' && row.costUsd > 0), 'Gemini spend is counted');
      await c.mutation(api.ai.chat.discard, { changeSetId });
    } finally {
      await c.action(api.ai.settings.setProviderKey, { provider: 'anthropic', apiKey: 'sk-ant-fake-key-1234' });
    }
  },

  async 'a rate limit waits and carries on, without losing the draft'() {
    const item = (await live()).news[2];
    const limited = { status: 429, message: 'Resource has been exhausted' };
    await script([
      { tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Before the limit' }]] },
      limited, limited, limited,
      DONE,
      OK,
    ]);
    const { threadId, changeSetId } = await say('Edit');
    await until('the wait notice', async () => /limit for this minute/.test((await draftOf(threadId)).notice ?? ''));
    const waiting = await draftOf(threadId);
    assert.ok(waiting.running && waiting.status === 'drafting', 'still running while it waits');
    const d = await until('it carries on', async () => {
      const x = await draftOf(threadId);
      return x.status === 'ready' ? x : null;
    }, 90000);
    assert.equal(d.contentOps[0].to, 'Before the limit');
    assert.ok(!d.notice, 'the notice clears');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'a busy model waits and carries on, and gives up clearly'() {
    const item = (await live()).news[2];
    const busy = { status: 503, message: 'This model is currently experiencing high demand.' };
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Before the rush' }]] }, busy, busy, busy, DONE, OK]);
    const { threadId, changeSetId } = await say('Edit');
    await until('the busy notice', async () => /very busy/.test((await draftOf(threadId)).notice ?? ''));
    const d = await until('it carries on', async () => {
      const x = await draftOf(threadId);
      return x.status === 'ready' ? x : null;
    }, 60000);
    assert.equal(d.contentOps[0].to, 'Before the rush');
    assert.ok(!d.notice, 'the notice clears');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'an API key pasted in the chat is refused and never stored'() {
    const secret = `AIza${'x'.repeat(30)}`;
    await script([DONE]);
    const before = (await control('state')).calls.length;
    await rejects(() => say(`here is my key ${secret}`), /looks like an API key/);
    assert.equal((await control('state')).calls.length, before);
    assert.ok(!JSON.stringify(await c.query(api.ai.audit.list, { limit: 20 })).includes(secret));
  },

  async 'a model priced at zero is refused'() {
    await rejects(
      () => c.mutation(api.ai.settings.save, { priceTable: [{ provider: 'openai', model: 'gpt-x', inputPerMTok: 0, outputPerMTok: 0 }] }),
      /enter a price/,
    );
  },

  async 'pointing: the clicked element reaches the agent with a source location'() {
    await script([{ tools: [['get_selected_element', {}]] }, { text: 'Got it.' }]);
    const { threadId, changeSetId } = await c.mutation(api.ai.chat.send, {
      prompt: 'Make this bigger',
      selectedElements: [{ path: '/nope', tag: 'a', key: null, text: 'Go to home page', classes: ['btn'], selector: 'a.btn' }, { path: '/', tag: 'h1', key: 'home.hero.title', text: 'No such words here', classes: [], selector: 'h1' }],
    });
    await inState(threadId, 'drafting');
    const { calls } = await control('state');
    assert.ok(JSON.stringify(calls[0].messages).includes('2 elements'), 'the agent is told how many');
    const results = toolResults(calls[1]);
    assert.ok(results.includes('notFound.hero.home'), 'it works out the website text key from the words');
    assert.ok(results.includes('home.hero.title'), 'it uses the key the page gave');
    assert.ok(results.includes('No such words here'), 'it gets every element');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },
};

const { tokens } = await c.action(api.auth.signIn, { provider: 'password', params: { email, password, flow: 'signIn' } });
c.setAuth(tokens.token);
await c.action(api.ai.settings.setProviderKey, { provider: 'anthropic', apiKey: 'sk-ant-fake-key-1234' });
const contentPrint=(s)=>JSON.stringify([s.news.map(x=>x.title),s.gallery.map(x=>x.subtext),s.startups.map(x=>x.name),s.team.map(x=>x.name),s.sections,s.text].map(a=>JSON.stringify(a)).sort());
const liveBefore = contentPrint(await live());
// These tests choose their own models and budget. Put the admin's back afterwards.
const saved = await c.query(api.ai.settings.get, {});
const OPUS = { provider: 'anthropic', model: 'claude-opus-5-5' };
await c.mutation(api.ai.settings.save, { editorModel: OPUS, reviewerModel: OPUS, monthlyBudgetUsd: 20 });

let failed = 0;
for (const [name, test] of Object.entries(tests)) {
  if (only && !name.includes(only)) continue;
  const started = Date.now();
  try {
    await test();
    console.log(`  ok    ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${String(e.data ?? e.message).slice(0, 600)}`);
  }
}
if (!only && contentPrint(await live()) !== liveBefore) {
  failed++;
  console.log('  FAIL  the tests left something different on the live site');
}
await c.mutation(api.ai.settings.save, { editorModel: saved.editorModel, reviewerModel: saved.reviewerModel, monthlyBudgetUsd: saved.monthlyBudgetUsd });
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
