import { usePageTitle } from '../hooks/usePageTitle.js';
import { useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useConversations } from '../api/conversations.js';
import { useSocket } from '../hooks/useSocket.js';
import ConversationList from '../components/messages/ConversationList.jsx';
import ChatWindow from '../components/messages/ChatWindow.jsx';
import { UnreadBadge } from '../components/messages/Presence.jsx';
import ErrorState from '../components/layout/ErrorState.jsx';

/**
 * Two-pane inbox (list + chat). On mobile only one pane shows: the list at /inbox, the chat at /inbox/:id.
 * Strict black / white / gray — the only colour is the green "online" dot.
 */
export default function Inbox() {
  const { connectionId } = useParams();
  const activeId = connectionId ? Number(connectionId) : null;
  const conversations = useConversations();
  const { connected } = useSocket();
  const active = conversations.data?.find((c) => c.connectionId === activeId);
  const totalUnread = conversations.data?.reduce((n, c) => n + c.unread, 0) ?? 0;
  usePageTitle(`${totalUnread ? `(${totalUnread}) ` : ''}${active ? `${active.user.name} · ` : ''}Inbox`);

  if (conversations.isError) return <ErrorState message={conversations.error.message} onRetry={conversations.refetch} />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-display text-4xl sm:text-5xl">
            Inbox <UnreadBadge count={totalUnread} className="!h-7 !min-w-7 text-sm" />
          </h1>
        </div>
        <span className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-black dark:bg-white' : 'animate-pulse bg-neutral-400'}`} aria-hidden="true" />
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="grid h-[calc(100vh-14rem)] min-h-[520px] overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-card md:grid-cols-[340px_1fr] dark:border-neutral-800 dark:bg-neutral-900">
        <aside className={`min-h-0 border-neutral-200 md:border-r dark:border-neutral-800 ${activeId ? 'hidden md:block' : 'block'}`}>
          <ConversationList conversations={conversations.data} isLoading={conversations.isLoading} />
        </aside>

        <section className={`min-h-0 ${activeId ? 'block' : 'hidden md:block'}`}>
          {active ? (
            <ChatWindow key={active.connectionId} conversation={active} />
          ) : activeId && conversations.isSuccess ? (
            <EmptyPane title="Conversation not found" text="It may have been removed, or the connection isn’t accepted yet." />
          ) : (
            <EmptyPane title="Pick a conversation" text="Messages arrive in real time. Green means they’re online now." />
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyPane({ title, text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-neutral-50 px-6 text-center dark:bg-neutral-950">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
        <MessageSquare size={22} />
      </span>
      <p className="mt-4 font-display text-3xl">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-neutral-600">{text}</p>
    </div>
  );
}
