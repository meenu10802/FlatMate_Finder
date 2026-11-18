import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowUp, Check, CheckCheck, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useSocket } from '../../hooks/useSocket.js';
import { flattenMessages, useMessages } from '../../api/conversations.js';
import { dayKey, formatClock, formatDayLabel } from '../../lib/format.js';
import { PresenceAvatar } from './Presence.jsx';

const MAX = 2000;

export default function ChatWindow({ conversation }) {
  const { user } = useAuth();
  const { isOnline, isTyping, sendMessage, discardFailed, markRead, sendTyping, setActiveThread, connected } = useSocket();
  const { connectionId, user: other } = conversation;
  const history = useMessages(connectionId);
  const messages = flattenMessages(history.data);

  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const prevHeight = useRef(null);
  const online = isOnline(other.id);
  const typing = isTyping(connectionId);

  // Mark as active (so incoming messages don't count as unread) + mark read on open/focus.
  useEffect(() => {
    setActiveThread(connectionId);
    const read = () => document.visibilityState === 'visible' && markRead(connectionId);
    if (conversation.unread) read();
    document.addEventListener('visibilitychange', read);
    return () => {
      setActiveThread(null);
      document.removeEventListener('visibilitychange', read);
    };
  }, [connectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep scrolled to bottom for new messages; keep position when older ones load above.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeight.current != null) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, typing]);

  const onScroll = () => {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const loadOlder = () => {
    prevHeight.current = scrollRef.current.scrollHeight;
    history.fetchNextPage();
  };

  const lastMineId = [...messages].reverse().find((m) => m.senderId === user.id)?.id;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <Link to="/inbox" className="-ml-1 rounded-full p-2 text-neutral-600 hover:bg-neutral-100 md:hidden dark:hover:bg-neutral-800" aria-label="Back to conversations">
          <ArrowLeft size={18} />
        </Link>
        <PresenceAvatar name={other.name} src={other.avatarUrl} online={online} />
        <div className="min-w-0 flex-1">
          <Link to={`/profiles/${other.id}`} className="block truncate font-bold hover:underline">{other.name}</Link>
          <p className="truncate text-xs text-neutral-500" aria-live="polite">
            {typing ? <span className="font-semibold text-black dark:text-white">typing…</span> : online ? 'Online' : 'Offline'}
            {other.location && <span> · {other.location}</span>}
          </p>
        </div>
        {!connected && <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-600">Reconnecting…</span>}
      </header>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-4 py-5 dark:bg-neutral-950" role="log" aria-label={`Messages with ${other.name}`}>
        {history.hasNextPage && (
          <div className="mb-4 text-center">
            <button type="button" onClick={loadOlder} disabled={history.isFetchingNextPage}
              className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:border-black dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              {history.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {history.isLoading && <p className="py-10 text-center text-sm text-neutral-500">Loading messages…</p>}
        {history.isError && <p className="py-10 text-center text-sm text-neutral-600">{history.error.message}</p>}

        {!history.isLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <PresenceAvatar name={other.name} src={other.avatarUrl} online={online} size="lg" />
            <p className="mt-4 font-display text-3xl">Say hello to {other.name.split(' ')[0]}.</p>
            <p className="mt-2 max-w-xs text-sm text-neutral-500">You’re connected. Ask about the flat, move-in dates or set up a visit.</p>
          </div>
        )}

        <ol className="space-y-1.5">
          {messages.map((m, i) => {
            const mine = m.senderId === user.id;
            const prev = messages[i - 1];
            const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
            const grouped = prev && !newDay && prev.senderId === m.senderId && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60000;
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <li className="flex items-center gap-3 py-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{formatDayLabel(m.createdAt)}</span>
                    <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                  </li>
                )}
                <li className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'pt-2'}`}>
                  <div className={`max-w-[80%] sm:max-w-[65%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-[15px] leading-snug ${
                        mine
                          ? `bg-black text-white dark:bg-white dark:text-black ${grouped ? 'rounded-tr-lg' : 'rounded-br-lg'}`
                          : `border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 ${grouped ? 'rounded-tl-lg' : 'rounded-bl-lg'}`
                      } ${m.pending ? 'opacity-60' : ''} ${m.failed ? 'border-2 border-dashed border-black bg-white !text-black dark:border-white' : ''}`}
                    >
                      {m.body}
                    </div>
                    <MessageMeta m={m} mine={mine} showStatus={m.id === lastMineId || m.pending || m.failed}
                      onRetry={() => { discardFailed(connectionId, m.id); sendMessage(connectionId, m.body); }}
                      onDiscard={() => discardFailed(connectionId, m.id)} />
                  </div>
                </li>
              </Fragment>
            );
          })}
          {typing && (
            <li className="flex justify-start pt-2" aria-hidden="true">
              <span className="flex gap-1 rounded-3xl rounded-bl-lg border border-neutral-200 bg-white px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-900">
                {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d}ms` }} />)}
              </span>
            </li>
          )}
        </ol>
      </div>

      <Composer connectionId={connectionId} onSend={(body) => { stickToBottom.current = true; sendMessage(connectionId, body); }} sendTyping={sendTyping} />
    </div>
  );
}

function MessageMeta({ m, mine, showStatus, onRetry, onDiscard }) {
  if (m.failed) {
    return (
      <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
        <AlertCircle size={12} /> {m.error || 'Not sent'}
        <button type="button" onClick={onRetry} className="underline underline-offset-2">Retry</button>
        <button type="button" onClick={onDiscard} className="text-neutral-500 underline underline-offset-2">Discard</button>
      </p>
    );
  }
  return (
    <p className="mt-1 flex items-center gap-1 px-1 text-xs text-neutral-500">
      {formatClock(m.createdAt)}
      {mine && showStatus && (
        m.pending ? <><Clock size={11} aria-hidden="true" /> Sending</>
          : m.readAt ? <><CheckCheck size={13} className="text-black dark:text-white" aria-hidden="true" /> Seen</>
          : <><Check size={13} aria-hidden="true" /> Sent</>
      )}
    </p>
  );
}

function Composer({ connectionId, onSend, sendTyping }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  const typingState = useRef({ on: false, timer: null, last: 0 });

  // Reset when switching chats.
  useEffect(() => {
    setText('');
    ref.current?.focus();
  }, [connectionId]);

  // Auto-grow up to ~6 lines.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const stopTyping = () => {
    const s = typingState.current;
    clearTimeout(s.timer);
    if (s.on) sendTyping(connectionId, false);
    s.on = false;
  };

  useEffect(() => stopTyping, [connectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (e) => {
    setText(e.target.value.slice(0, MAX));
    const s = typingState.current;
    const now = Date.now();
    if (!s.on || now - s.last > 2500) {
      sendTyping(connectionId, true);
      s.on = true;
      s.last = now;
    }
    clearTimeout(s.timer);
    s.timer = setTimeout(stopTyping, 3000);
  };

  const submit = (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setText('');
    stopTyping();
  };

  return (
    <form onSubmit={submit} className="border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-end gap-2 rounded-3xl border border-neutral-300 bg-white py-1.5 pl-4 pr-1.5 focus-within:border-black dark:border-neutral-700 dark:bg-neutral-950 dark:focus-within:border-white">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
          }}
          placeholder="Write a message…"
          aria-label="Message"
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-snug placeholder:text-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-95 disabled:bg-neutral-200 disabled:text-neutral-500 dark:bg-white dark:text-black dark:disabled:bg-neutral-800"
          aria-label="Send message"
        >
          <ArrowUp size={18} />
        </button>
      </div>
      <p className="mt-1.5 flex justify-between px-2 text-xs text-neutral-500">
        <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
        {text.length > MAX - 200 && <span className="font-semibold text-black dark:text-white">{text.length}/{MAX}</span>}
      </p>
    </form>
  );
}
