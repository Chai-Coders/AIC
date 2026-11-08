// End-to-end checks of the AI Assistant backend against a local deployment, with
// a scripted fake model (fake-services.mjs). They never call a real provider.
// A draft the review passes is sent to the Versions page's pending AI draft, the
// same one AI apps add to over MCP; the tests approve or reject it there, and undo
// what they approved, like an admin would. See tests/ai/README.md.
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
// Internal functions, through the CLI as an admin would run them.
const convexRun = (fn, args) => {
  const out = execFileSync('npx', ['convex', 'run', fn, JSON.stringify(args)], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first', CONVEX_AGENT_MODE: 'anonymous' },
  });
  return JSON.parse(out);
};
const wouldClean = () => convexRun('images:cleanupUnused', { keepNewerThanMs: 0, dryRun: true });
// What an AI app proposes over MCP (mcp.ts calls these).
const mcpProposes = (fn, args) => convexRun(`drafts:${fn}`, { app: 'Test app', ...args });
const describe = (summary, extra = {}) => ['describe_change', { summary, ...extra }];
const OK = { tools: [['approve', {}]] };
const DONE = { text: 'Done.' };

// The Versions page.
const waiting = () => c.query(api.drafts.get, {});
async function approveWaiting() {
  const d = await waiting();
  assert.ok(d, 'nothing is waiting on the Versions page');
  const seen = d.changes.map((x) => ({ id: x.id, editedAt: x.editedAt }));
  return c.mutation(api.drafts.approve, { draftId: d.id, seen, images: [] });
}
async function rejectWaiting() {
  const d = await waiting();
  if (d) await c.mutation(api.drafts.reject, { draftId: d.id });
}
async function undoVersion(versionId) {
  const version = await c.query(api.versions.get, { versionId });
  const changeIds = version.changes.filter((x) => !x.skipped && !x.overridden).map((x) => x.id);
  return c.mutation(api.versions.undoVersion, { versionId, changeIds });
}

const tests = {
  async 'browser access: everything needs a session, and keys never come back'() {
    await rejects(() => anon.query(api.ai.settings.get, {}), /session/i);
    await rejects(() => anon.mutation(api.ai.chat.send, { prompt: 'hi' }), /session/i);
    await rejects(() => anon.query(api.ai.preview.siteContentPreview, {}), /session/i);
    await rejects(() => anon.mutation(api.ai.send.sendAnyway, { changeSetId: 'x' }), /./);
    await rejects(() => anon.query(api.drafts.get, {}), /./);
    const s = await c.query(api.ai.settings.get, {});
    const text = JSON.stringify(s);
    assert.ok(!text.includes('sk-ant-fake') && !text.includes('ciphertext'), 'settings leak the key');
    assert.equal(s.providers.find((p) => p.name === 'anthropic').last4, '1234');
  },

  async 'content path: private until approved on the Versions page, then undone there'() {
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
    const d = await inState(threadId, 'sent');
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

    // Passing review only puts it on the Versions page.
    assert.equal((await live()).news[0].title, item.title, 'live content changed before it was approved');
    const w = await waiting();
    assert.equal(d.versionId, w.id, 'the draft points at the pending AI draft');
    assert.equal(w.app, 'AI Assistant');
    assert.deepEqual(w.changes.map((x) => [x.entity, x.recordId, x.field, x.after]), [['news', item.id, 'title', NEW]]);
    const preview = await c.query(api.ai.preview.siteContentPreview, { changeSetId });
    assert.equal(preview.news.find((n) => n.id === item.id).title, NEW);
    const pendingPreview = await c.query(api.ai.preview.siteContentPreview, { pending: true });
    assert.equal(pendingPreview.news.find((n) => n.id === item.id).title, NEW, 'the preview shows what is waiting');
    const livePreview = await c.query(api.ai.preview.siteContentPreview, {});
    assert.equal(livePreview.news.find((n) => n.id === item.id).title, item.title, '"before" is the live site');
    await rejects(() => c.mutation(api.ai.chat.discard, { changeSetId }), /can't be discarded/);

    const { applied, versionId } = await approveWaiting();
    assert.equal(applied, 1);
    assert.equal((await live()).news.find((n) => n.id === item.id).title, NEW);
    assert.equal(await waiting(), null);
    const version = await c.query(api.versions.get, { versionId });
    assert.deepEqual([version.source, version.status, version.app], ['mcp', 'approved', 'AI Assistant'], 'it is the newest version in the history');

    await undoVersion(versionId);
    assert.equal((await live()).news.find((n) => n.id === item.id).title, item.title);

    const log = await c.query(api.ai.audit.list, { changeSetId });
    for (const action of ['prompt', 'tool.update_record', 'model.editor', 'model.reviewer', 'review.approved', 'sent']) {
      assert.ok(log.some((row) => row.action === action), `audit log has ${action}`);
    }
    assert.ok(log.some((row) => row.action === 'model.editor' && row.costUsd > 0), 'audit log has the cost');
  },

  async 'a follow-up builds on what is waiting, and a reject leaves the site alone'() {
    const item = (await live()).news[0];
    const edit = (value) => ({ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value }], describe('Summary')] });
    await script([edit('First go'), DONE, OK]);
    const { threadId } = await say('Change the summary');
    const first = await inState(threadId, 'sent');

    await script([{ tools: [['get_site_content', { table: 'news', id: item.id }]] }, edit('Second go'), DONE, OK]);
    await say('Make it shorter', threadId);
    const second = await until('a second draft', async () => {
      const x = await draftOf(threadId);
      return x._id !== first._id && x.status === 'sent' ? x : null;
    });
    assert.match(toolResults((await control('state')).calls[1]), /First go/, 'the agent reads what is waiting');
    assert.equal(second.contentOps[0].from, 'First go');
    assert.equal(second.versionId, first.versionId, 'both go into the one pending AI draft');
    const w = await waiting();
    assert.deepEqual(w.changes.map((x) => [x.field, x.after]), [['subtitle', 'Second go']], 'one change per field, with the latest value');

    await rejectWaiting();
    assert.equal((await live()).news.find((n) => n.id === item.id).subtitle, item.subtitle);
    assert.equal(await waiting(), null);
  },

  async 'what AI apps propose over MCP is part of what the assistant sees and changes'() {
    const stamp = Date.now();
    const item = (await live()).news[1];
    mcpProposes('proposeEdit', { field: `news/${item.id}/title`, value: `From MCP ${stamp}` });
    const { id: newId } = mcpProposes('proposeCreate', { type: 'team', fields: { name: `Proposed ${stamp}`, role: 'Advisor', category: 'team' } });
    assert.equal(newId, 'new-1');
    await script([
      { tools: [['get_site_content', { table: 'teamMembers', query: String(stamp) }], ['get_site_content', { table: 'news', id: item.id }]] },
      { tools: [['update_record', { table: 'teamMembers', id: newId, field: 'role', value: 'Mentor' }], describe('Changed the role')] },
      DONE,
      OK,
    ]);
    const { threadId } = await say('Make the new person a mentor');
    await inState(threadId, 'sent');
    const results = toolResults((await control('state')).calls[1]);
    assert.ok(results.includes(`Proposed ${stamp}`) && results.includes(`From MCP ${stamp}`), 'it reads what the app proposed');
    const w = await waiting();
    assert.equal(w.app, 'Test app, AI Assistant', 'one draft, both named');
    const created = w.changes.find((x) => x.op === 'create');
    assert.equal(created.rawAfter.role, 'Mentor', 'the edit went into the waiting record');
    assert.equal(w.changes.length, 2);
    await rejectWaiting();
    assert.ok(!(await live()).team.some((m) => m.name === `Proposed ${stamp}`));
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

  async 'website text: finds it, drafts it, approves over the registry, undoes'() {
    const KEY = 'notFound.hero.title';
    const textOf = (content, key = KEY) => content.text?.find((t) => t.key === key)?.value;
    const draftTo = (value) => ({ tools: [['update_site_text', { key: KEY, value }], describe('Changed the heading', { page: '/page-not-found', text: value ?? 'We couldn' })] });

    await script([{ tools: [['get_site_text', { query: 'find that page' }]] }, draftTo('Lost page'), DONE, OK]);
    let { threadId, changeSetId } = await say('Change the not found heading');
    let d = await inState(threadId, 'sent');
    assert.deepEqual(d.contentOps[0], { op: 'text', key: KEY, from: null, to: 'Lost page' });
    const { calls } = await control('state');
    assert.ok(toolResults(calls[1]).includes(KEY), 'search finds the key from the words on the page');
    assert.ok(toolResults(calls[1]).includes('Page not found'), 'and says which page it is on');
    assert.ok(calls[3].messages[0].content[0].text.includes('Lost page'), 'the reviewer sees the edit');

    assert.equal(textOf(await live()), undefined, 'live text changed before it was approved');
    const preview = await c.query(api.ai.preview.siteContentPreview, { changeSetId });
    assert.equal(textOf(preview), 'Lost page');
    const v1 = (await approveWaiting()).versionId;
    assert.equal(textOf(await live()), 'Lost page');

    // A second change over it, then going back to the code's text with null.
    await script([draftTo('Lost again'), DONE, OK]);
    ({ threadId, changeSetId } = await say('Reword it'));
    d = await inState(threadId, 'sent');
    assert.equal(d.contentOps[0].from, 'Lost page');
    const v2 = (await approveWaiting()).versionId;
    await script([draftTo(null), DONE, OK]);
    ({ threadId, changeSetId } = await say('Back to the original'));
    await inState(threadId, 'sent');
    const v3 = (await approveWaiting()).versionId;
    assert.equal(textOf(await live()), undefined, 'null removes the edit');

    // Undoing each version restores each state: no row, then the earlier value.
    await undoVersion(v3);
    assert.equal(textOf(await live()), 'Lost again');
    await undoVersion(v2);
    assert.equal(textOf(await live()), 'Lost page');
    await undoVersion(v1);
    assert.equal(textOf(await live()), undefined, 'back to the text in the code');
  },

  async 'website text: a later Site text edit stays on top, and bad keys are refused'() {
    const KEY = 'notFound.hero.desc';
    await script([{ tools: [['update_site_text', { key: KEY, value: 'Agent words' }]] }, DONE, OK]);
    let { threadId, changeSetId } = await say('Change the description');
    await inState(threadId, 'sent');
    await c.mutation(api.siteText.publish, { changes: [{ key: KEY, value: 'Admin words' }] });
    const w = await waiting();
    assert.ok(w.changes[0].overriddenNow, 'the Versions page says a later edit wins');
    const { applied, kept } = await approveWaiting();
    assert.deepEqual([applied, kept], [0, 1]);
    assert.equal((await live()).text.find((t) => t.key === KEY).value, 'Admin words');
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

  async 'an edit made by hand keeps the date and place, as an approved AI edit does'() {
    const before = await live();
    const news = before.news.at(-1);
    // One with every required field, so the hand edit is accepted.
    const startupIndex = before.startups.findLastIndex((x) => x.description?.trim());
    const startup = before.startups[startupIndex];
    await c.mutation(api.news.update, { id: news.id, title: `${news.title} (edited)`, subtitle: news.subtitle, content: news.content });
    await c.mutation(api.startups.update, { id: startup.id, name: `${startup.name} (edited)`, description: startup.description, website_url: startup.website_url ?? undefined });
    let after = await live();
    assert.equal(after.news.find((n) => n.id === news.id).published_date, news.published_date, 'the article kept its date');
    assert.equal(after.news.at(-1).id, news.id, 'and its place');
    assert.equal(after.startups[startupIndex].id, startup.id, 'the startup kept its place');
    await c.mutation(api.news.update, { id: news.id, title: news.title, subtitle: news.subtitle, content: news.content });
    await c.mutation(api.startups.update, { id: startup.id, name: startup.name, description: startup.description, website_url: startup.website_url ?? undefined });
    after = await live();
    assert.equal(after.news.find((n) => n.id === news.id).title, news.title);
  },

  async 'a person can be added by hand without a photo, as an AI can'() {
    const name = `No photo ${Date.now()}`;
    const id = await c.mutation(api.team.create, { name, role: 'Advisor', category: 'governor' });
    const person = (await live()).team.find((m) => m.id === id);
    assert.equal(person.name, name);
    assert.ok(!person.photo, 'no photo');
    await c.mutation(api.team.remove, { id });
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
    const { threadId } = await say('Rename it');
    await inState(threadId, 'sent');
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

    await rejectWaiting();
  },

  async 'approving keeps a CMS edit made after the assistant sent its change'() {
    const item = (await live()).startups[0];
    await script([{ tools: [['update_record', { table: 'startups', id: item.id, field: 'name', value: 'Agent Name' }]] }, DONE, OK]);
    const { threadId } = await say('Rename the startup');
    await inState(threadId, 'sent');
    await c.mutation(api.startups.update, { id: item.id, name: 'Admin Name', description: item.description });
    const { kept } = await approveWaiting();
    assert.equal(kept, 1);
    assert.equal((await live()).startups.find((s) => s.id === item.id).name, 'Admin Name');
    await c.mutation(api.startups.update, { id: item.id, name: item.name, description: item.description });
  },

  async 'a draft whose record was deleted meanwhile is not sent'() {
    const imageId = await upload();
    const id = await c.mutation(api.gallery.create, { imageId, subtext: `Gone ${Date.now()}` });
    await script([{ tools: [['update_record', { table: 'gallery', id, field: 'subtext', value: 'New caption' }]] }, DONE, { delay: 2000, tools: [['approve', {}]] }]);
    const { threadId, changeSetId } = await say('Recaption it');
    await inState(threadId, 'reviewing');
    await c.mutation(api.gallery.remove, { id });
    const d = await inState(threadId, 'needs_admin');
    assert.match(d.notice, /couldn't be sent to the Versions page/);
    assert.equal(await waiting(), null, 'nothing was sent');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'deletes always wait for the admin, and can be declined or restored'() {
    const target = (await live()).gallery.at(-1);
    await script([{ tools: [['delete_record', { table: 'gallery', id: target.id, reason: 'Asked to remove it' }]] }, { text: 'Waiting.' }]);
    const { threadId, changeSetId } = await say('Delete the oldest photo');
    let d = await inState(threadId, 'needs_admin');
    assert.equal(d.pendingConfirm.id, target.id);
    assert.equal(d.contentOps.length, 0, 'an unconfirmed delete entered the draft');
    await rejects(() => c.mutation(api.ai.send.sendAnyway, { changeSetId }), /can't be sent now/);
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
    d = await inState(threadId, 'sent');
    assert.equal(d.contentOps[0].op, 'delete');
    assert.ok((await live()).gallery.some((g) => g.id === target.id), 'deleted before it was approved');
    const { versionId } = await approveWaiting();
    assert.ok(!(await live()).gallery.some((g) => g.id === target.id));
    await undoVersion(versionId);
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
    assert.equal(await waiting(), null, 'an objected draft is not sent by itself');
    await c.mutation(api.ai.send.sendAnyway, { changeSetId });
    assert.equal((await draftOf(threadId)).status, 'sent');
    assert.equal((await live()).news.find((n) => n.id === item.id).subtitle, item.subtitle, 'sending anyway still waits for approval');
    const log = await c.query(api.ai.audit.list, { changeSetId });
    assert.ok(log.some((row) => row.action === 'sent.overrideReview'), 'the override is logged');
    const { versionId } = await approveWaiting();
    assert.equal((await live()).news.find((n) => n.id === item.id).subtitle, 'Attempt 3');
    await undoVersion(versionId);
  },

  async 'a review with no verdict is not a pass'() {
    const item = (await live()).news[1];
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Unjudged' }]] }, DONE, { text: 'Looks fine to me.' }]);
    const { threadId, changeSetId } = await say('Edit');
    const d = await inState(threadId, 'needs_admin');
    assert.equal(d.review.verdict, 'rejected');
    assert.equal(await waiting(), null, 'nothing went to the Versions page');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'spend cap stops mid-task, keeps the draft, and carries on when raised'() {
    const item = (await live()).news[2];
    // Each fake call costs $0.008 at the Opus price: room for exactly two.
    await c.mutation(api.ai.settings.save, { monthlyBudgetUsd: (await spent()) + 0.012 });
    const edit = (value) => ({ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value }]] });
    await script([edit('Step one'), edit('Step two'), edit('Step three'), DONE, OK]);
    const { threadId } = await say('A long task');
    const d = await inState(threadId, 'needs_admin');
    assert.match(d.notice, /budget/i);
    assert.equal(d.contentOps[0].to, 'Step two', 'the draft so far is kept');
    assert.equal((await control('state')).remaining, 3, 'no model call after the cap');
    assert.equal((await c.query(api.ai.usage.meter, {})).level, 'blocked');
    assert.equal(await waiting(), null);

    await c.mutation(api.ai.settings.save, { monthlyBudgetUsd: 20 });
    await say('Carry on', threadId);
    const done = await inState(threadId, 'sent');
    assert.equal(done.contentOps[0].to, 'Step three');
    await rejectWaiting();
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
    // Stop while the slow step is with the model; before that, a new run would make the call itself.
    // (the fake has handed out the slow reply once only DONE is left).
    await until('the slow step to reach the model', async () => (await control('state')).remaining === 1);
    await c.mutation(api.ai.chat.stop, { changeSetId });
    await say('Do something else instead', threadId);
    await inState(threadId, 'sent', 'reviewing', 'drafting', 'needs_admin');
    await later(4500);
    const d = await draftOf(threadId);
    assert.equal(d.contentOps[0]?.to, 'First', 'the stopped step wrote to the draft');
    await c.mutation(api.ai.chat.stop, { changeSetId }).catch(() => undefined);
    await c.mutation(api.ai.chat.discard, { changeSetId }).catch(() => undefined);
    await rejectWaiting();
  },

  async 'Stop can never reopen a sent draft'() {
    const item = (await live()).news[2];
    const value = `Stop test ${Date.now()}`;
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value }]] }, DONE, OK]);
    const { threadId, changeSetId } = await say('Edit');
    await inState(threadId, 'sent');
    await c.mutation(api.ai.chat.stop, { changeSetId });
    assert.equal((await draftOf(threadId)).status, 'sent');
    await rejects(() => c.mutation(api.ai.send.sendAnyway, { changeSetId }), /can't be sent now/);
    assert.equal((await waiting()).changes.length, 1, 'sent once');
    await rejectWaiting();
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
    const { threadId } = await say('Add these people');
    const d = await inState(threadId, 'sent');
    assert.equal(d.contentOps.length, 3);
    assert.match(toolResults((await control('state')).calls[2]), /only use a picture the admin attached/, 'someone else\'s photo is refused');
    const { versionId } = await approveWaiting();
    const team = (await live()).team;
    assert.equal(team.find((m) => m.name === `Gov ${stamp}`).category_display, 'Board of Governors');
    assert.equal(team.find((m) => m.name === `Mentor ${stamp}`).category, 'mentor_india_academic');
    await undoVersion(versionId);
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
    const { threadId } = await c.mutation(api.ai.chat.send, { prompt: 'Add a startup and a news post', pictures: [{ imageId, name: 'logo.png' }] });
    const d = await inState(threadId, 'sent');
    const { calls } = await control('state');
    assert.ok(JSON.stringify(calls[0].messages).includes(imageId), 'the agent is told about the attached picture');
    assert.match(JSON.stringify(calls.at(-1).messages), /What the editing agent told the admin:\\n(?!\(nothing\))/, 'the review sees what the editor told the admin');
    assert.match(toolResults(calls[1]), /needs: logoId\. Ask the admin to attach/, 'no picture is refused');
    assert.match(toolResults(calls[1]), /only use a picture the admin attached/, 'another startup\'s logo is refused');
    assert.equal(d.contentOps.length, 2);
    assert.ok(!wouldClean().includes(imageId), 'cleanup must keep a picture waiting on the Versions page');
    const { versionId } = await approveWaiting();
    const site = await live();
    assert.ok(site.startups.find((s) => s.name === `name ${stamp}`).logo_or_image.includes(imageId));
    assert.equal(site.news.find((n) => n.title === `Title ${stamp}`).content, 'Full story');
    assert.equal(site.startups.find((s) => s.name === `name ${stamp}`).alt_text, 'Logo', 'alt text is kept');
    await undoVersion(versionId);
    assert.ok(!(await live()).startups.some((s) => s.name === `name ${stamp}`));
    const stray = await upload();
    assert.ok(wouldClean().includes(stray), 'cleanup still finds unused pictures');
  },

  async 'a deleted record keeps its picture, so undoing it still has it'() {
    const imageId = await upload();
    const id = await c.mutation(api.gallery.create, { imageId, subtext: `Keep ${Date.now()}` });
    await script([{ tools: [['delete_record', { table: 'gallery', id, reason: 'Asked' }]] }]);
    const { threadId, changeSetId } = await say('Delete it');
    await inState(threadId, 'needs_admin');
    await script([DONE, OK]);
    await c.mutation(api.ai.chat.answerConfirm, { changeSetId, approve: true });
    await inState(threadId, 'sent');
    const { versionId } = await approveWaiting();
    assert.ok(!wouldClean().includes(imageId), 'cleanup would break undoing it');
    await undoVersion(versionId);
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
    const { threadId } = await say('Update the contact details');
    const d = await inState(threadId, 'sent');
    const results = toolResults((await control('state')).calls[1]);
    assert.equal(results.match(/full web address/g)?.length, 3);
    assert.deepEqual(d.contentOps.map((op) => op.key).sort(), ['contact.phones', 'links.instagram', 'links.youtube']);
    const { versionId } = await approveWaiting();
    const text = Object.fromEntries((await live()).text.map((t) => [t.key, t.value]));
    assert.equal(text['contact.phones'], phones);
    assert.equal(text['links.instagram'], 'https://instagram.com/new');
    await undoVersion(versionId);
    assert.ok(!(await live()).text.some((t) => t.key === 'contact.phones'));
    // The Site text page goes through the same check.
    await rejects(() => c.mutation(api.siteText.publish, { changes: [{ key: 'links.apply', value: 'www.forms.com/x' }] }), /full web address/);
    await rejects(() => c.mutation(api.siteText.publish, { changes: [{ key: 'links.apply', value: 'javascript:alert(1)' }] }), /full web address/);
    await rejects(() => c.mutation(api.siteText.publish, { changes: [{ key: 'links.apply', value: '' }] }), /full web address/);
    // So do AI apps over MCP.
    assert.throws(() => mcpProposes('proposeEdit', { field: 'text/links.apply/value', value: 'javascript:alert(1)' }), /full web address/);
    assert.equal(await waiting(), null);
  },

  async 'the change list can be corrected'() {
    const item = (await live()).news[2];
    await script([
      { tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Temp' }], describe('Old idea'), describe('Kept idea')] },
      { tools: [['remove_change', { summary: 'Old idea' }], ['remove_change', { summary: 'Never added' }]] },
      DONE,
      OK,
    ]);
    const { threadId } = await say('Edit');
    const d = await inState(threadId, 'sent');
    assert.deepEqual(d.changeList.map((x) => x.summary), ['Kept idea']);
    await rejectWaiting();
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
      const d = await inState(threadId, 'sent', 'needs_admin');
      assert.equal(d.status, 'sent', d.notice);
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
      await rejectWaiting();
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
    const { threadId } = await say('Edit');
    await until('the wait notice', async () => /limit for this minute/.test((await draftOf(threadId)).notice ?? ''));
    const waiting = await draftOf(threadId);
    assert.ok(waiting.running && waiting.status === 'drafting', 'still running while it waits');
    const d = await until('it carries on', async () => {
      const x = await draftOf(threadId);
      return x.status === 'sent' ? x : null;
    }, 90000);
    assert.equal(d.contentOps[0].to, 'Before the limit');
    assert.ok(!d.notice, 'the notice clears');
    await rejectWaiting();
  },

  async 'a busy model waits and carries on, and gives up clearly'() {
    const item = (await live()).news[2];
    const busy = { status: 503, message: 'This model is currently experiencing high demand.' };
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Before the rush' }]] }, busy, busy, busy, DONE, OK]);
    const { threadId } = await say('Edit');
    await until('the busy notice', async () => /very busy/.test((await draftOf(threadId)).notice ?? ''));
    const d = await until('it carries on', async () => {
      const x = await draftOf(threadId);
      return x.status === 'sent' ? x : null;
    }, 60000);
    assert.equal(d.contentOps[0].to, 'Before the rush');
    assert.ok(!d.notice, 'the notice clears');
    await rejectWaiting();
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
if (await waiting()) {
  console.log('Something is already waiting on the Versions page. Approve or reject it first: the tests use that draft.');
  process.exit(1);
}
const contentPrint = (s) => JSON.stringify([s.news.map((x) => x.title), s.gallery.map((x) => x.subtext), s.startups.map((x) => x.name), s.team.map((x) => x.name), s.text].map((a) => JSON.stringify(a)).sort());
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
