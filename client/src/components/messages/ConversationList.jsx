import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useSocket } from '../../hooks/useSocket.js';
import { formatThreadTime } from '../../lib/format.js';
import Button from '../ui/Button.jsx';
import { PresenceAvatar, UnreadBadge } from './Presence.jsx';

export default function ConversationList({ conversations, isLoading }) {
  const { user } = useAuth();
  const { isOnline, isTyping } = useSocket();
  const [q, setQ] = useState('');
  const shown = (conversations ?? []).filter((c) => c.user.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-10 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm placeholder:text-neutral-500 focus:border-black focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-white"
          />
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversations">
        {isLoading &&
          [0, 1, 2].map((i) => (
            <li key={i} className="flex animate-pulse items-center gap-3 px-4 py-4">
              <span className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800" />
              <span className="flex-1 space-y-2"><span className="block h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800" /><span className="block h-3 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800" /></span>
            </li>
          ))}

        {!isLoading && conversations?.length === 0 && (
          <li className="flex flex-col items-center px-6 py-14 text-center">
            <Users size={28} className="text-neutral-400" />
            <p className="mt-3 font-bold">No conversations yet</p>
            <p className="mt-1 text-sm text-neutral-500">Connect with someone from Browse — once they accept, you can chat here.</p>
            <Button as={Link} to="/browse" variant="secondary" size="sm" className="mt-5">Browse flatmates</Button>
          </li>
        )}

        {shown.map((c) => {
          const last = c.lastMessage;
          const typingNow = isTyping(c.connectionId);
          const preview = typingNow
            ? 'typing…'
            : last
              ? `${last.senderId === user.id ? 'You: ' : ''}${last.body}`
              : 'Connected — say hello';
          return (
            <li key={c.connectionId}>
              <NavLink
                to={`/inbox/${c.connectionId}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-l-2 px-4 py-3.5 transition-colors ${
                    isActive
                      ? 'border-black bg-neutral-100 dark:border-white dark:bg-neutral-800'
                      : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`
                }
              >
                <PresenceAvatar name={c.user.name} src={c.user.avatarUrl} online={isOnline(c.user.id)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.user.name}</span>
                    <span className={`shrink-0 text-xs ${c.unread ? 'font-bold text-black dark:text-white' : 'text-neutral-500'}`}>
                      {formatThreadTime(last?.createdAt ?? c.connectedAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${typingNow ? 'italic text-neutral-600' : c.unread ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}>
                      {preview}
                    </span>
                    <UnreadBadge count={c.unread} />
                  </span>
                </span>
              </NavLink>
            </li>
          );
        })}

        {!isLoading && conversations?.length > 0 && shown.length === 0 && (
          <li className="px-6 py-10 text-center text-sm text-neutral-500">No one matches “{q}”.</li>
        )}
      </ul>
    </div>
  );
}
