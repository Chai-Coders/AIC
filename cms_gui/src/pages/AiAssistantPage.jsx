import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { run } from '../services/convex';
import { buildSandboxFiles, sandboxDependencies } from '../preview/sandbox';
import { loadLocalSources } from '../preview/localSources';
import ChatPane from '../components/ai/ChatPane';
import PreviewPane from '../components/ai/PreviewPane';
import { useBuildCheck } from '../components/ai/useBuildCheck';

const api = anyApi.ai;

const env = { VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL };
const assetOrigin = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '');
const OPEN_DRAFT = ['drafting', 'building', 'reviewing', 'needs_admin', 'ready', 'publishing'];
const FRONTEND = 'frontend/';

export default function AiAssistantPage() {
  const { showToast } = useOutletContext();

  const latestThread = useQuery(api.chat.latest);
  const [chosenThread, setChosenThread] = useState(null);
  const threadId = chosenThread ?? latestThread ?? null;
  const draft = useQuery(api.chat.draft, threadId ? { threadId } : 'skip') ?? null;
  const messages = useQuery(api.chat.messages, threadId ? { threadId } : 'skip');

  const send = useMutation(api.chat.send);
  const newThread = useMutation(api.chat.newThread);
  const discard = useMutation(api.chat.discard);
  const reportBuild = useMutation(api.chat.reportBuild);
  const applyContent = useMutation(api.publish.applyPendingContent);
  const abandonContent = useMutation(api.publish.abandonPendingContent);
  const publish = useAction(api.publish.publish);

  // ---- What the preview shows -------------------------------------------

  const openDraft = draft && OPEN_DRAFT.includes(draft.status) ? draft : null;
  const remoteSources = useQuery(api.repo.frontendSources);
  const [localSources, setLocalSources] = useState(null);
  useEffect(() => {
    // Without a GitHub token there's no copy on the server: use the one bundled in the CMS.
    if (remoteSources === null && !localSources) loadLocalSources().then(setLocalSources);
  }, [remoteSources, localSources]);
  const sources = remoteSources?.files ?? localSources;

  const liveContent = useQuery(api.preview.siteContentPreview, {});
  const draftContent = useQuery(api.preview.siteContentPreview, openDraft ? { changeSetId: openDraft._id } : {});

  const [mode, setMode] = useState('after');
  // The build check has to compile the draft, whatever the admin was looking at.
  const effectiveMode = openDraft?.status === 'building' ? 'after' : mode;

  const codeEdits = useMemo(() => {
    if (!openDraft || effectiveMode === 'before') return undefined;
    const edits = {};
    for (const edit of openDraft.codeEdits) {
      if (edit.path.startsWith(FRONTEND)) edits[edit.path.slice(FRONTEND.length)] = edit.content;
    }
    return edits;
  }, [openDraft, effectiveMode]);

  const content = effectiveMode === 'before' ? liveContent : draftContent;
  // A query with new arguments is briefly undefined. Keep showing the last
  // content meanwhile, or the preview would be torn down and rebuilt.
  const [contentJson, setContentJson] = useState(undefined);
  const nextJson = content === undefined ? contentJson : JSON.stringify(content);
  if (nextJson !== contentJson) setContentJson(nextJson);
  const files = useMemo(() => {
    if (!sources || contentJson === undefined) return null;
    return buildSandboxFiles({ sources, codeEdits, content: JSON.parse(contentJson), env, assetOrigin });
  }, [sources, codeEdits, contentJson]);
  const packageJson = sources?.['package.json'];
  const dependencies = useMemo(() => (packageJson ? sandboxDependencies(packageJson) : undefined), [packageJson]);

  // ---- Preview events and the build check ---------------------------------

  const preview = useRef(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [location, setLocation] = useState('/');
  const [tab, setTab] = useState('preview');
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState(null);

  const build = useBuildCheck({
    draft: openDraft,
    previewReady,
    navigate: (path) => preview.current?.navigate(path),
    report: (revision, error) => {
      run(() => reportBuild({ changeSetId: openDraft._id, revision, error })).catch((err) => showToast(err.message, 'error'));
    },
  });

  // ---- Walkthrough --------------------------------------------------------

  const changeList = useMemo(() => openDraft?.changeList ?? [], [openDraft]);
  const [step, setStep] = useState(0);
  // Follow the newest change as they arrive; start over on a new draft.
  const [lastCount, setLastCount] = useState(0);
  if (changeList.length !== lastCount) {
    setLastCount(changeList.length);
    setStep(Math.max(0, changeList.length - 1));
  }

  const highlightStep = useCallback(
    (index, viewMode) => {
      const item = changeList[index];
      if (!item?.page) return;
      preview.current?.highlight({
        path: item.page,
        selector: viewMode === 'before' ? undefined : item.selector,
        text: viewMode === 'before' ? item.beforeText || item.text : item.text,
        label: item.summary,
      });
    },
    [changeList],
  );

  const onStep = (index) => {
    setStep(index);
    // Backend or CMS code has nothing on the site to point at.
    setTab(changeList[index]?.page ? 'preview' : 'changes');
    highlightStep(index, effectiveMode);
  };

  // Show the first change once the draft is ready.
  const ready = openDraft?.status === 'ready';
  const [wasReady, setWasReady] = useState(false);
  if (ready !== wasReady) {
    setWasReady(ready);
    if (ready && changeList.length) {
      setStep(0);
      setTab(changeList[0].page ? 'preview' : 'changes');
    }
  }
  useEffect(() => {
    if (ready) highlightStep(0, 'after');
    // Only when the draft becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const onMode = (next) => {
    setMode(next);
    // The sandbox reloads with the other version and re-applies this when ready.
    highlightStep(step, next);
  };

  // ---- Actions ---------------------------------------------------------------

  const onSend = async (prompt) => {
    const result = await run(() => send({ prompt, ...(threadId ? { threadId } : {}), ...(selected ? { selectedElement: selected } : {}) }));
    setChosenThread(result.threadId);
    setSelected(null);
    setMode('after');
    preview.current?.clearHighlight();
  };

  const onNewChat = async () => {
    try {
      setChosenThread(await run(() => newThread({})));
      setSelected(null);
      setMode('after');
      setTab('preview');
      preview.current?.clearHighlight();
      preview.current?.navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const [publishing, setPublishing] = useState(false);
  const overrideNeeded = openDraft?.status === 'needs_admin' && openDraft.review?.verdict === 'rejected' && !openDraft.pendingConfirm && !openDraft.buildError;

  const onPublish = async () => {
    if (overrideNeeded && !window.confirm(`The review agent objected:\n\n${openDraft.review.reasons.join('\n')}\n\nPublish anyway?`)) return;
    setPublishing(true);
    try {
      await run(() => publish({ changeSetId: openDraft._id, override: overrideNeeded }));
      showToast('Published.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const onDiscard = async () => {
    if (!window.confirm('Discard this draft? None of its changes will go live.')) return;
    try {
      await run(() => discard({ changeSetId: openDraft._id }));
      setMode('after');
      preview.current?.clearHighlight();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onApplyContent = async () => {
    if (!window.confirm('Apply the content changes now? Do this once the website shows the new code.')) return;
    try {
      await run(() => applyContent({ versionId: openDraft.versionId }));
      showToast('Content applied.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onAbandonContent = async () => {
    if (!window.confirm("Give up on these content changes? The code stays published; you can roll it back from AI history.")) return;
    try {
      await run(() => abandonContent({ versionId: openDraft.versionId }));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const togglePick = () => {
    const next = !picking;
    setPicking(next);
    setTab('preview');
    preview.current?.pick(next);
  };

  // On a phone the two panes share the screen, one at a time.
  const [phonePane, setPhonePane] = useState('chat');

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="Pane" className="flex shrink-0 border-b border-border bg-card md:hidden">
        {['chat', 'site'].map((pane) => (
          <button
            key={pane}
            type="button"
            role="tab"
            aria-selected={phonePane === pane}
            onClick={() => setPhonePane(pane)}
            className={`flex-1 py-2 text-sm font-medium capitalize ${phonePane === pane ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}
          >
            {pane}
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
        <div className={`min-h-0 border-border md:block md:border-r ${phonePane === 'chat' ? '' : 'hidden'}`}>
          <ChatPane
            threadId={threadId}
            draft={openDraft}
            closedNotice={draft && !openDraft ? draft.notice : null}
            messages={messages}
            selected={selected}
            onClearSelected={() => {
              setSelected(null);
              preview.current?.clearHighlight();
            }}
            picking={picking}
            onTogglePick={togglePick}
            onSend={onSend}
            onNewChat={onNewChat}
            showToast={showToast}
          />
        </div>
        <div className={`min-h-0 min-w-0 md:block ${phonePane === 'site' ? '' : 'hidden'}`}>
          <PreviewPane
            ref={preview}
            tab={tab}
            onTab={setTab}
            files={files}
            dependencies={dependencies}
            draft={openDraft}
            changeList={changeList}
            step={Math.min(step, Math.max(0, changeList.length - 1))}
            onStep={onStep}
            mode={effectiveMode}
            onMode={onMode}
            location={location}
            canPublish={openDraft?.status === 'ready' || overrideNeeded}
            publishLabel={overrideNeeded ? 'Publish anyway' : 'Publish'}
            publishing={publishing}
            onPublish={onPublish}
            onDiscard={onDiscard}
            onApplyContent={onApplyContent}
            onAbandonContent={onAbandonContent}
            onReady={() => setPreviewReady(true)}
            onLocation={setLocation}
            onPicked={(element) => {
              setSelected(element);
              setPicking(false);
              setPhonePane('chat');
            }}
            onCompiling={build.onCompiling}
            onCompiled={build.onCompiled}
            onBuildError={build.onBuildError}
            onRuntimeError={build.onRuntimeError}
          />
        </div>
      </div>
    </div>
  );
}
