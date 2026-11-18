import { STATUS_DOTS, toneFor } from '../../lib/statusColor.js';
import Avatar from '../ui/Avatar.jsx';

/** Green = online, gray = offline. The only colour in the Inbox. */
export function OnlineDot({ online, size = 'md', className = '' }) {
  const s = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';
  return (
    <span
      className={`inline-block shrink-0 rounded-full ring-2 ring-white dark:ring-neutral-900 ${s} ${STATUS_DOTS[toneFor(online ? 'online' : 'offline')]} ${className}`}
      role="img"
      aria-label={online ? 'Online' : 'Offline'}
      title={online ? 'Online' : 'Offline'}
    />
  );
}

export function PresenceAvatar({ name, src, online, size = 'md' }) {
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar name={name} src={src} size={size} />
      <OnlineDot online={online} size={size === 'sm' ? 'sm' : 'md'} className="absolute -bottom-0.5 -right-0.5" />
    </span>
  );
}

/** Monochrome unread count pill. */
export function UnreadBadge({ count, className = '' }) {
  if (!count) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-xs font-bold leading-none text-white dark:bg-white dark:text-black ${className}`}
      aria-label={`${count} unread ${count === 1 ? 'message' : 'messages'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
