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

const OPEN_DRAFT = ['drafting', 'reviewing', 'needs_admin'];
const MAX_POINTED = 10; // Same limit as convex-backend/convex/ai/chat.ts.
const TOUR_STEP_MS = 3500;
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
  const sendAnyway = useMutation(api.send.sendAnyway);

  // ---- What the preview shows -------------------------------------------

  const openDraft = draft && OPEN_DRAFT.includes(draft.status) ? draft : null;
  // Once reviewed, a draft goes to the Versions page. It stays on show here while it waits there.
  const sentDraft = draft?.status === 'sent' && draft.versionStatus === 'pending' ? draft : null;
  const decided =
    draft?.status === 'sent' && draft.versionStatus !== 'pending'
      ? draft.versionStatus === 'approved'
        ? 'You approved this on the Versions page, so it is on the website. You can undo it there.'
        : 'This was rejected on the Versions page, so nothing on the website changed.'
      : null;
  const shownDraft = openDraft ?? sentDraft;
  const liveContent = useQuery(api.preview.siteContentPreview, {});
  // "After" includes everything waiting on the Versions page, so the preview shows what approving it would do.
  const draftContent = useQuery(api.preview.siteContentPreview, shownDraft ? { changeSetId: shownDraft._id } : { pending: true });
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
    setTour([]);
    setPicking(next);
    if (next && tab === 'changes') setTab('preview');
    preview.current?.pick(next);
    if (next) setPhonePane('site');
  };

  // ---- Walkthrough --------------------------------------------------------

  const changeList = useMemo(() => shownDraft?.changeList ?? [], [shownDraft]);
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
    setTour([]);
    setStep(index);
    if (tab === 'changes') setTab('preview');
    highlightStep(index, mode);
  };

  // Everything the draft changes stays marked and numbered on the page. What the admin
  // pointed at is marked too, in another colour.
  useEffect(() => {
    const pointed = selected.map((item, i) => ({ n: i + 1, path: item.path, key: item.key, selector: item.selector, text: item.text, selectorFirst: true }));
    const changes = changeList.map((item, i) => ({
      n: i + 1,
      kind: 'change',
      path: item.page?.startsWith('/') ? item.page : null,
      key: item.textKey,
      selector: mode === 'before' ? undefined : item.selector,
      text: mode === 'before' ? item.beforeText || item.text : item.text,
    }));
    preview.current?.marks([...changes.filter((c) => c.key || c.selector || c.text), ...pointed]);
  }, [selected, changeList, mode]);

  // When the draft has been sent, go to what it just changed, one change after another.
  // What was there before the admin's last message isn't news. A manual step stops this.
  const ready = !!sentDraft;
  const [known, setKnown] = useState(null);
  const [tour, setTour] = useState([]);
  const [wasReady, setWasReady] = useState(false);
  if (ready !== wasReady) {
    setWasReady(ready);
    if (ready && changeList.length) {
      const fresh = known ? changeList.flatMap((item, i) => (known.has(item.summary) ? [] : [i])) : [];
      setKnown(null);
      setStep(fresh[0] ?? 0);
      setTour(fresh.slice(1));
    }
  }
  useEffect(() => {
    if (ready) highlightStep(step, 'after');
    // Only when the draft has just been sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!tour.length) return undefined;
    const timer = setTimeout(() => {
      setStep(tour[0]);
      highlightStep(tour[0], 'after');
      setTour(tour.slice(1));
    }, TOUR_STEP_MS);
    return () => clearTimeout(timer);
  }, [tour, highlightStep]);

  const onMode = (next) => {
    setTour([]);
    setMode(next);
    highlightStep(step, next);
  };

  // ---- Actions ---------------------------------------------------------------

  const onSend = async (prompt, pictures) => {
    setKnown(new Set(changeList.map((item) => item.summary)));
    setTour([]);
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

  const [sending, setSending] = useState(false);
  const overrideNeeded = openDraft?.status === 'needs_admin' && openDraft.review?.verdict === 'rejected' && !openDraft.pendingConfirm;

  const onSendAnyway = async () => {
    if (!window.confirm(`The review agent objected:\n\n${openDraft.review.reasons.join('\n')}\n\nSend it to the Versions page anyway? Nothing goes live until you approve it there.`)) return;
    setSending(true);
    try {
      await run(() => sendAnyway({ changeSetId: openDraft._id }));
      setMode('after');
      preview.current?.clearHighlight();
      showToast('Sent to the Versions page. Approve it there to put it on the website.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSending(false);
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
            sent={!!sentDraft}
            closedNotice={decided ?? (draft && !shownDraft ? draft.notice : null)}
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
            shownDraftId={shownDraft?._id}
            sent={!!sentDraft}
            changeList={changeList}
            step={Math.min(step, Math.max(0, changeList.length - 1))}
            onStep={onStep}
            mode={mode}
            onMode={onMode}
            location={location}
            canSendAnyway={overrideNeeded}
            sending={sending}
            onSendAnyway={onSendAnyway}
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
