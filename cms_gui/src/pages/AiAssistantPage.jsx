import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { run } from '../services/convex';
import ChatPane from '../components/ai/ChatPane';
import PreviewPane from '../components/ai/PreviewPane';
import SplitDivider from '../components/ai/SplitDivider';
import { useStoredSize } from '../components/ai/useStoredSize';

const api = anyApi.ai;

const OPEN_DRAFT = ['drafting', 'reviewing', 'needs_admin', 'ready'];
const MAX_POINTED = 10; // Same limit as convex-backend/convex/ai/chat.ts.
const sameElement = (a, b) => a.path === b.path && a.selector === b.selector;

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
  const publish = useMutation(api.publish.publish);

  // ---- What the preview shows -------------------------------------------

  const openDraft = draft && OPEN_DRAFT.includes(draft.status) ? draft : null;
  const liveContent = useQuery(api.preview.siteContentPreview, {});
  const draftContent = useQuery(api.preview.siteContentPreview, openDraft ? { changeSetId: openDraft._id } : {});
  const [mode, setMode] = useState('after');

  // A query with new arguments is briefly undefined. Keep the last content meanwhile.
  const shown = mode === 'before' ? liveContent : draftContent;
  const [contentJson, setContentJson] = useState(null);
  const nextJson = shown === undefined ? contentJson : JSON.stringify(shown);
  if (nextJson !== contentJson) setContentJson(nextJson);
  const content = useMemo(() => (contentJson ? JSON.parse(contentJson) : null), [contentJson]);

  const preview = useRef(null);
  const [location, setLocation] = useState('/');
  const [tab, setTab] = useState('preview');

  // ---- Pointing -----------------------------------------------------------

  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState([]);
  const [chatWidth, setChatWidth] = useStoredSize('aic-cms:ai-chat-width', 384);

  useEffect(() => {
    preview.current?.marks(selected.map((item, i) => ({ n: i + 1, path: item.path, key: item.key, selector: item.selector, text: item.text })));
  }, [selected]);

  const onPicked = (element) => {
    if (selected.length >= MAX_POINTED && !selected.some((s) => sameElement(s, element))) {
      showToast(`You can point at up to ${MAX_POINTED} things at a time.`, 'error');
      return;
    }
    setSelected((items) => (items.some((s) => sameElement(s, element)) ? items.filter((s) => !sameElement(s, element)) : [...items, element]));
  };

  // On a phone the two panes share the screen, one at a time.
  const [phonePane, setPhonePane] = useState('chat');

  const togglePick = () => {
    const next = !picking;
    setPicking(next);
    if (next && tab === 'changes') setTab('preview');
    preview.current?.pick(next);
    if (next) setPhonePane('site');
  };

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
      if (!item?.page) {
        // Don't leave the last change outlined under this one's description.
        preview.current?.clearHighlight();
        return;
      }
      preview.current?.highlight({
        path: item.page,
        // A website text has the same key before and after.
        key: item.textKey,
        selector: viewMode === 'before' ? undefined : item.selector,
        text: viewMode === 'before' ? item.beforeText || item.text : item.text,
        label: item.summary,
      });
    },
    [changeList],
  );

  const onStep = (index) => {
    setStep(index);
    if (tab === 'changes') setTab('preview');
    highlightStep(index, mode);
  };

  // Show the first change once the draft is ready.
  const ready = openDraft?.status === 'ready';
  const [wasReady, setWasReady] = useState(false);
  if (ready !== wasReady) {
    setWasReady(ready);
    if (ready && changeList.length) setStep(0);
  }
  useEffect(() => {
    if (ready) highlightStep(0, 'after');
    // Only when the draft becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const onMode = (next) => {
    setMode(next);
    highlightStep(step, next);
  };

  // ---- Actions ---------------------------------------------------------------

  const onSend = async (prompt, pictures) => {
    const result = await run(() =>
      send({ prompt, ...(threadId ? { threadId } : {}), ...(selected.length ? { selectedElements: selected } : {}), ...(pictures.length ? { pictures } : {}) }),
    );
    setChosenThread(result.threadId);
    setSelected([]);
    if (picking) togglePick();
    setMode('after');
    preview.current?.clearHighlight();
  };

  const onNewChat = async () => {
    try {
      setChosenThread(await run(() => newThread({})));
      setSelected([]);
      setMode('after');
      setTab('preview');
      preview.current?.navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const [publishing, setPublishing] = useState(false);
  const overrideNeeded = openDraft?.status === 'needs_admin' && openDraft.review?.verdict === 'rejected' && !openDraft.pendingConfirm;

  const onPublish = async () => {
    if (overrideNeeded && !window.confirm(`The review agent objected:\n\n${openDraft.review.reasons.join('\n')}\n\nPublish anyway?`)) return;
    setPublishing(true);
    try {
      await run(() => publish({ changeSetId: openDraft._id, override: overrideNeeded }));
      setMode('after');
      preview.current?.clearHighlight();
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
      <div className="flex min-h-0 flex-1" style={{ '--aic-chat-width': `${chatWidth}px` }}>
        <div className={`min-h-0 w-full md:block md:w-[var(--aic-chat-width)] md:shrink-0 ${phonePane === 'chat' ? '' : 'hidden'}`}>
          <ChatPane
            threadId={threadId}
            draft={openDraft}
            closedNotice={draft && !openDraft ? draft.notice : null}
            messages={messages}
            selected={selected}
            onRemoveSelected={(item) => setSelected((items) => items.filter((s) => !sameElement(s, item)))}
            picking={picking}
            onTogglePick={togglePick}
            onSend={onSend}
            onNewChat={onNewChat}
            showToast={showToast}
          />
        </div>
        <div className="hidden md:block">
          <SplitDivider label="Resize the chat" value={chatWidth} min={300} max={640} onChange={setChatWidth} />
        </div>
        <div className={`min-h-0 min-w-0 flex-1 md:block ${phonePane === 'site' ? '' : 'hidden'}`}>
          <PreviewPane
            ref={preview}
            tab={tab}
            onTab={setTab}
            content={content}
            draft={openDraft}
            changeList={changeList}
            step={Math.min(step, Math.max(0, changeList.length - 1))}
            onStep={onStep}
            mode={mode}
            onMode={onMode}
            location={location}
            canPublish={openDraft?.status === 'ready' || overrideNeeded}
            publishLabel={overrideNeeded ? 'Publish anyway' : 'Publish'}
            publishing={publishing}
            onPublish={onPublish}
            onDiscard={onDiscard}
            onLocation={setLocation}
            picking={picking}
            onDonePicking={togglePick}
            onPicked={onPicked}
            onPickEnded={() => setPicking(false)}
          />
        </div>
      </div>
    </div>
  );
}
