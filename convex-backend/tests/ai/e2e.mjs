// End-to-end checks of the AI Assistant backend against a local deployment, with
// a scripted fake model and a fake GitHub (fake-services.mjs). They never call a
// real provider or the real repo. See tests/ai/README.md.
import assert from 'node:assert/strict';
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

const describe = (summary, extra = {}) => ['describe_change', { summary, kind: 'content', ...extra }];
const OK = { tools: [['approve', {}]] };
const DONE = { text: 'Done.' };
const FILE = 'frontend/src/pages/NotFoundPage.jsx';

const tests = {
  async 'browser access: everything needs a session, and keys never come back'() {
    await rejects(() => anon.query(api.ai.settings.get, {}), /session/i);
    await rejects(() => anon.mutation(api.ai.chat.send, { prompt: 'hi' }), /session/i);
    await rejects(() => anon.query(api.ai.preview.siteContentPreview, {}), /session/i);
    await rejects(() => anon.action(api.ai.versions.rollback, { versionId: 'x' }), /./);
    const s = await c.query(api.ai.settings.get, {});
    const text = JSON.stringify(s);
    assert.ok(!text.includes('sk-ant-fake') && !text.includes('ciphertext'), 'settings leak the key');
    assert.equal(s.providers.find((p) => p.name === 'anthropic').last4, '1234');
  },

  async 'content path: draft stays private until Publish, then rolls back'() {
    const before = await live();
    const item = before.news[0];
    await script([
      { tools: [['get_site_content', { table: 'news', query: item.title.slice(0, 8) }]] },
      { tools: [['update_record', { table: 'news', id: item.id, field: 'title', value: 'Edited by the agent' }], describe('Changed the headline', { page: '/news', text: 'Edited by the agent' })] },
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
    assert.ok(calls[3].messages[0].content[0].text.includes('Edited by the agent'), 'the reviewer sees the edit');
    assert.ok(!JSON.stringify(calls).includes('fake-token'), 'the GitHub token reaches the model');

    assert.equal((await live()).news[0].title, item.title, 'live content changed before Publish');
    const preview = await c.query(api.ai.preview.siteContentPreview, { changeSetId });
    assert.equal(preview.news.find((n) => n.id === item.id).title, 'Edited by the agent');

    await c.action(api.ai.publish.publish, { changeSetId });
    assert.equal((await live()).news.find((n) => n.id === item.id).title, 'Edited by the agent');
    assert.equal((await draftOf(threadId)).status, 'published');

    const [version] = await c.query(api.ai.versions.list, {});
    assert.equal(version.kind, 'content');
    await c.action(api.ai.versions.rollback, { versionId: version.id });
    assert.equal((await live()).news.find((n) => n.id === item.id).title, item.title);
    const [newest, old] = await c.query(api.ai.versions.list, {});
    assert.ok(newest.isRollback && old.rolledBack);
    await rejects(() => c.action(api.ai.versions.rollback, { versionId: version.id }), /already/);

    const log = await c.query(api.ai.audit.list, { changeSetId });
    for (const action of ['prompt', 'tool.update_record', 'model.editor', 'model.reviewer', 'review.approved', 'publish.start', 'rollback']) {
      assert.ok(log.some((row) => row.action === action), `audit log has ${action}`);
    }
    assert.ok(log.some((row) => row.action === 'model.editor' && row.costUsd > 0), 'audit log has the cost');
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
    assert.equal(d.codeEdits.length, 0, 'wording is content, not a code edit');
    const { calls } = await control('state');
    assert.ok(toolResults(calls[1]).includes(KEY), 'search finds the key from the words on the page');
    assert.ok(toolResults(calls[1]).includes('Page not found'), 'and says which page it is on');
    assert.ok(calls[3].messages[0].content[0].text.includes('Lost page'), 'the reviewer sees the edit');

    assert.equal(textOf(await live()), undefined, 'live text changed before Publish');
    const preview = await c.query(api.ai.preview.siteContentPreview, { changeSetId });
    assert.equal(textOf(preview), 'Lost page');

    await c.action(api.ai.publish.publish, { changeSetId });
    assert.equal(textOf(await live()), 'Lost page');

    // A second publish over it, then going back to the code's text with null.
    await script([draftTo('Lost again'), DONE, OK]);
    ({ threadId, changeSetId } = await say('Reword it'));
    d = await inState(threadId, 'ready');
    assert.equal(d.contentOps[0].from, 'Lost page');
    await c.action(api.ai.publish.publish, { changeSetId });
    await script([draftTo(null), DONE, OK]);
    ({ threadId, changeSetId } = await say('Back to the original'));
    await inState(threadId, 'ready');
    await c.action(api.ai.publish.publish, { changeSetId });
    assert.equal(textOf(await live()), undefined, 'null removes the edit');

    // Rollbacks restore each state: no row, then the earlier value.
    let [newest, previous] = await c.query(api.ai.versions.list, {});
    await c.action(api.ai.versions.rollback, { versionId: newest.id });
    assert.equal(textOf(await live()), 'Lost again');
    await c.action(api.ai.versions.rollback, { versionId: previous.id });
    assert.equal(textOf(await live()), 'Lost page');
    const list = await c.query(api.ai.versions.list, {});
    const first = list.find((v) => !v.isRollback && !v.rolledBack);
    await c.action(api.ai.versions.rollback, { versionId: first.id });
    assert.equal(textOf(await live()), undefined, 'back to the text in the code');
  },

  async 'website text: stops on conflicts with the Site text page, refuses bad keys'() {
    const KEY = 'notFound.hero.desc';
    await script([{ tools: [['update_site_text', { key: KEY, value: 'Agent words' }]] }, DONE, OK]);
    let { threadId, changeSetId } = await say('Change the description');
    await inState(threadId, 'ready');
    await c.mutation(api.siteText.publish, { changes: [{ key: KEY, value: 'Admin words' }] });
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId }), /has changed/);
    assert.equal((await live()).text.find((t) => t.key === KEY).value, 'Admin words');
    await c.mutation(api.ai.chat.discard, { changeSetId });

    // A later Site text edit also blocks rolling back over it.
    await script([{ tools: [['update_site_text', { key: KEY, value: 'Agent words' }]] }, DONE, OK]);
    ({ threadId, changeSetId } = await say('Change it again'));
    await inState(threadId, 'ready');
    await c.action(api.ai.publish.publish, { changeSetId });
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.siteText.publish, { changes: [{ key: KEY, value: 'Admin again' }] });
    await rejects(() => c.action(api.ai.versions.rollback, { versionId: version.id }), /changed after this publish/);
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

  async 'rollback refuses to overwrite a later edit'() {
    const item = (await live()).startups[0];
    await script([{ tools: [['update_record', { table: 'startups', id: item.id, field: 'name', value: 'Agent Name' }]] }, DONE, OK]);
    const { threadId, changeSetId } = await say('Rename the startup');
    await inState(threadId, 'ready');
    await c.action(api.ai.publish.publish, { changeSetId });
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.startups.update, { id: item.id, name: 'Admin Name', description: item.description });
    await rejects(() => c.action(api.ai.versions.rollback, { versionId: version.id }), /changed after this publish/);
    assert.equal((await live()).startups.find((s) => s.id === item.id).name, 'Admin Name');
    await c.mutation(api.startups.update, { id: item.id, name: item.name, description: item.description });
  },

  async 'Publish stops when a record changed since the draft'() {
    const item = (await live()).team[0];
    await script([{ tools: [['update_record', { table: 'teamMembers', id: item.id, field: 'role', value: 'Agent Role' }]] }, DONE, OK]);
    const { threadId, changeSetId } = await say('Change the job title');
    await inState(threadId, 'ready');
    await c.mutation(api.team.update, { id: item.id, name: item.name, role: 'Changed Meanwhile', category: item.category, bio: item.bio });
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId }), /changed since/);
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
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId, override: true }), /hasn't passed/);
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
    await c.action(api.ai.publish.publish, { changeSetId });
    assert.ok(!(await live()).gallery.some((g) => g.id === target.id));
    const [version] = await c.query(api.ai.versions.list, {});
    await c.action(api.ai.versions.rollback, { versionId: version.id });
    const restored = (await live()).gallery.find((g) => g.subtext === target.subtext && g.image === target.image);
    assert.ok(restored, 'the record and its picture came back');
  },

  async 'protected files and paths outside the repo are refused'() {
    await script([
      {
        tools: [
          ['edit_file', { path: 'convex-backend/convex/lib/access.ts', content: 'export const x = 1' }],
          ['edit_file', { path: 'convex-backend/convex/auth.ts', content: 'x' }],
          ['create_file', { path: 'convex-backend/convex/ai/evil.ts', content: 'x' }],
          ['edit_file', { path: 'convex-backend/convex/ai/usage.ts', content: 'x' }],
          ['edit_file', { path: 'cms_gui/package.json', content: '{}' }],
          ['create_file', { path: 'frontend/../../etc/evil', content: 'x' }],
          ['create_file', { path: '.github/workflows/x.yml', content: 'x' }],
          ['edit_file', { path: 'frontend/scripts/snapshot.mjs', content: 'x' }],
          ['create_file', { path: 'frontend/.npmrc', content: 'x' }],
          ['edit_file', { path: 'convex-backend/convex/http.ts', content: 'x' }],
          ['create_file', { path: 'convex-backend/convex/leak.ts', content: 'x' }],
          ['edit_file', { path: 'cms_gui/src/main.jsx', content: 'x' }],
          ['edit_file', { path: 'convex-backend//convex/ai/tools.ts', content: 'x' }],
          ['edit_file', { path: 'convex-backend/convex/AI/tools.ts', content: 'x' }],
          ['create_file', { path: 'frontend/postcss.config.ts', content: 'x' }],
          ['create_file', { path: 'frontend/.postcssrc.cjs', content: 'x' }],
          ['read_file', { path: 'convex-backend/.env.local' }],
          ['read_file', { path: '../secrets' }],
        ],
      },
      { text: 'A developer has to do that.' },
    ]);
    const { threadId, changeSetId } = await say('Remove the admin check');
    const d = await inState(threadId, 'drafting');
    assert.equal(d.codeEdits.length, 0);
    const { calls } = await control('state');
    const results = toolResults(calls[1]);
    assert.equal(results.match(/can't be edited by the AI Assistant|isn't a valid path/g)?.length, 16, results.slice(0, 500));
    assert.equal(results.match(/can't be read/g)?.length, 2);
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'code path: build retries, then review, Publish through GitHub, rollback'() {
    const original = (await control('file', { path: FILE })).content;
    assert.ok(original, 'fake repo has the file');
    const first = original.split('\n').find((l) => l.trim().length > 12).trim();
    const edit = { tools: [['edit_file', { path: FILE, replacements: [{ find: first, replace: `${first} {/* edited */}` }] }], describe('Edited the not found page', { kind: 'code', page: '/nope' })] };
    await script([{ tools: [['search_code', { query: first.slice(0, 12), folder: 'frontend/src/' }], ['read_file', { path: FILE }]] }, edit, DONE]);
    const { threadId, changeSetId } = await say('Edit the not found page');
    let d = await inState(threadId, 'building');
    const { calls } = await control('state');
    assert.ok(toolResults(calls[1]).includes(FILE), 'search and read work on the cached repo');
    assert.equal(d.codeEdits[0].path, FILE);
    assert.ok(d.codeEdits[0].baseSha, 'records the blob it was based on');

    // Two automatic retries on build errors, then the admin is told.
    for (const attempt of [1, 2]) {
      await script([DONE]);
      await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: d.updatedAt, error: `SyntaxError ${attempt}` });
      await until(`retry ${attempt}`, async () => (await draftOf(threadId)).buildAttempts === attempt && (await draftOf(threadId)).status === 'building');
      d = await draftOf(threadId);
    }
    await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: d.updatedAt, error: 'SyntaxError 3' });
    d = await inState(threadId, 'needs_admin');
    assert.match(d.buildError, /SyntaxError 3/);
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId, override: true }), /hasn't passed/);

    await script([DONE]);
    await say('Try again', threadId);
    d = await inState(threadId, 'building');
    assert.equal(d.buildAttempts, 0, 'a new instruction resets retries');
    // A result for an older version of the draft is ignored.
    await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: 1, error: null });
    assert.equal((await draftOf(threadId)).status, 'building');
    await script([OK]);
    await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: d.updatedAt, error: null });
    await inState(threadId, 'ready');

    const diff = await c.query(api.ai.preview.changes, { changeSetId });
    assert.ok(diff.code[0].diff.includes('{/* edited */}') && diff.code[0].previewable);

    assert.equal((await control('file', { path: FILE })).content, original, 'branch changed before Publish');
    const headBefore = (await control('state')).head;
    await c.action(api.ai.publish.publish, { changeSetId });
    const after = await control('state');
    assert.notEqual(after.head, headBefore);
    assert.ok((await control('file', { path: FILE })).content.includes('{/* edited */}'));
    assert.match(after.commits.find((x) => x.sha === after.head).message, /Edited the not found page/);
    assert.equal((await draftOf(threadId)).status, 'published');

    const [version] = await c.query(api.ai.versions.list, {});
    assert.equal(version.kind, 'code');
    await c.action(api.ai.versions.rollback, { versionId: version.id });
    assert.equal((await control('file', { path: FILE })).content, original);
  },

  async 'Publish stops when the same file changed on the branch'() {
    const original = (await control('file', { path: FILE })).content;
    await script([{ tools: [['read_file', { path: FILE }]] }, { tools: [['edit_file', { path: FILE, content: `${original}\n// agent` }]] }, DONE]);
    const { threadId, changeSetId } = await say('Edit the file');
    const d = await inState(threadId, 'building');
    await script([OK]);
    await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: d.updatedAt, error: null });
    await inState(threadId, 'ready');
    await control('external-edit', { path: FILE, content: `${original}\n// someone else` });
    const head = (await control('state')).head;
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId }), /changed on .* since the draft started/);
    assert.equal((await control('state')).head, head, 'nothing was committed');
    assert.equal((await draftOf(threadId)).status, 'ready');
    await c.mutation(api.ai.chat.discard, { changeSetId });
    await control('external-edit', { path: FILE, content: original });
    await c.action(api.ai.repo.refresh, {});
  },

  async 'mixed: content waits for the deploy, and a failed deploy leaves it unapplied'() {
    const original = (await control('file', { path: FILE })).content;
    const item = (await live()).gallery[0];
    // Unique, so a value left behind by an interrupted run can't make the edit a no-op.
    const stamp = Date.now();
    const run = async (label) => {
      const caption = `${label} ${stamp}`;
      await script([{ tools: [['read_file', { path: FILE }]] }, { tools: [['edit_file', { path: FILE, content: `${original}\n// ${caption}` }], ['update_record', { table: 'gallery', id: item.id, field: 'subtext', value: caption }]] }, DONE]);
      const { threadId, changeSetId } = await say('Change code and content together');
      const d = await inState(threadId, 'building');
      assert.equal(d.contentOps.length, 1, 'the caption must really change, or this tests a code-only publish');
      await script([OK]);
      await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: d.updatedAt, error: null });
      await inState(threadId, 'ready');
      await c.action(api.ai.publish.publish, { changeSetId });
      const after = await draftOf(threadId);
      assert.equal(after.status, 'publishing');
      assert.notEqual((await live()).gallery.find((g) => g.id === item.id).subtext, caption, 'content applied before the deploy');
      return { threadId, head: (await control('state')).head };
    };

    let { threadId, head } = await run('Mixed caption');
    // An unrelated failing check isn't a failed deploy.
    await control('deploy', { sha: head, state: 'failure', context: 'lint' });
    await control('deploy', { sha: head, state: 'success' });
    await until('content applied', async () => (await draftOf(threadId)).status === 'published', 60000);
    assert.equal((await live()).gallery.find((g) => g.id === item.id).subtext, `Mixed caption ${stamp}`);
    let [version] = await c.query(api.ai.versions.list, {});
    assert.equal(version.kind, 'mixed');
    await c.action(api.ai.versions.rollback, { versionId: version.id });
    assert.equal((await live()).gallery.find((g) => g.id === item.id).subtext, item.subtext);
    assert.equal((await control('file', { path: FILE })).content, original);

    ({ threadId, head } = await run('Should not appear'));
    await control('deploy', { sha: head, state: 'failure' });
    const failed = await until('failure noticed', async () => {
      const d = await draftOf(threadId);
      return d.status === 'failed' ? d : null;
    }, 60000);
    assert.match(failed.notice, /failed to deploy/);
    assert.equal((await live()).gallery.find((g) => g.id === item.id).subtext, item.subtext);
    [version] = await c.query(api.ai.versions.list, {});
    await c.action(api.ai.versions.rollback, { versionId: version.id });
    assert.equal((await control('file', { path: FILE })).content, original);
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
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId }), /hasn't passed/);
    await c.action(api.ai.publish.publish, { changeSetId, override: true });
    assert.equal((await live()).news.find((n) => n.id === item.id).subtitle, 'Attempt 3');
    const log = await c.query(api.ai.audit.list, { changeSetId });
    assert.ok(log.some((row) => row.action === 'publish.overrideReview'), 'the override is logged');
    const [version] = await c.query(api.ai.versions.list, {});
    await c.action(api.ai.versions.rollback, { versionId: version.id });
  },

  async 'a review with no verdict is not a pass'() {
    const item = (await live()).news[1];
    await script([{ tools: [['update_record', { table: 'news', id: item.id, field: 'subtitle', value: 'Unjudged' }]] }, DONE, { text: 'Looks fine to me.' }]);
    const { threadId, changeSetId } = await say('Edit');
    const d = await inState(threadId, 'needs_admin');
    assert.equal(d.review.verdict, 'rejected');
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId }), /hasn't passed/);
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
    await rejects(() => c.action(api.ai.publish.publish, { changeSetId }), /hasn't passed/);

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

  async 'a GitHub failure before the commit never leaves a draft stuck in publishing'() {
    const original = (await control('file', { path: FILE })).content;
    await script([{ tools: [['read_file', { path: FILE }]] }, { tools: [['edit_file', { path: FILE, content: `${original}\n// x` }]] }, DONE]);
    const { threadId, changeSetId } = await say('Edit');
    const d = await inState(threadId, 'building');
    await script([OK]);
    await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: d.updatedAt, error: null });
    await inState(threadId, 'ready');
    const head = (await control('state')).head;
    await control('set', { truncated: true });
    try {
      await rejects(() => c.action(api.ai.publish.publish, { changeSetId }), /too large/);
    } finally {
      await control('set', { truncated: false });
    }
    assert.equal((await draftOf(threadId)).status, 'ready');
    assert.equal((await control('state')).head, head);
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },

  async 'a rollback that cannot restore content still records its commit'() {
    const original = (await control('file', { path: FILE })).content;
    const item = (await live()).gallery[1];
    const caption = `Rollback race ${Date.now()}`;
    await script([{ tools: [['read_file', { path: FILE }]] }, { tools: [['edit_file', { path: FILE, content: `${original}\n// race` }], ['update_record', { table: 'gallery', id: item.id, field: 'subtext', value: caption }]] }, DONE]);
    const { threadId, changeSetId } = await say('Change both');
    const d = await inState(threadId, 'building');
    await script([OK]);
    await c.mutation(api.ai.chat.reportBuild, { changeSetId, revision: d.updatedAt, error: null });
    await inState(threadId, 'ready');
    await c.action(api.ai.publish.publish, { changeSetId });
    const [version] = await c.query(api.ai.versions.list, {});
    await c.mutation(api.ai.publish.applyPendingContent, { versionId: version.id });

    await control('set', { refDelay: 2500 });
    try {
      const rollingBack = c.action(api.ai.versions.rollback, { versionId: version.id });
      await later(1200);
      await c.mutation(api.gallery.update, { id: item.id, subtext: 'Edited during rollback' });
      await rejects(() => rollingBack, /couldn't be restored/);
    } finally {
      await control('set', { refDelay: 0 });
    }
    const [newest, old] = await c.query(api.ai.versions.list, {});
    assert.equal(newest.status, 'failed');
    assert.ok(newest.commitSha && newest.isRollback, 'the revert commit is on record');
    assert.ok(old.rolledBack);
    assert.equal((await control('file', { path: FILE })).content, original);
    await c.mutation(api.gallery.update, { id: item.id, subtext: item.subtext });
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
      selectedElement: { path: '/nope', tag: 'a', text: 'Go to home page', classes: ['btn'], selector: 'a.btn' },
    });
    await inState(threadId, 'drafting');
    const { calls } = await control('state');
    assert.ok(JSON.stringify(calls[0].messages).includes('get_selected_element'), 'the agent is told to look');
    const results = toolResults(calls[1]);
    assert.ok(results.includes('notFound.hero.home'), 'it gets the website text key');
    assert.ok(results.includes('registry.js'), 'it gets the source location');
    await c.mutation(api.ai.chat.discard, { changeSetId });
  },
};

const { tokens } = await c.action(api.auth.signIn, { provider: 'password', params: { email, password, flow: 'signIn' } });
c.setAuth(tokens.token);
await c.action(api.ai.settings.setProviderKey, { provider: 'anthropic', apiKey: 'sk-ant-fake-key-1234' });
await c.mutation(api.ai.settings.save, { monthlyBudgetUsd: 20 });
await c.action(api.ai.repo.refresh, {});

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
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
