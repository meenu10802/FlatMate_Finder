import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../ui/Button.jsx';
import Avatar from '../ui/Avatar.jsx';
import { useConversations } from '../../api/conversations.js';
import { useConnections } from '../../api/connections.js';

const navClass = ({ isActive }) =>
  `inline-flex items-center rounded-full px-3.5 py-1.5 text-sm transition-colors ${
    isActive
      ? 'bg-black text-white dark:bg-white dark:text-black'
      : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
  }`;

export function Logo() {
  return (
    <Link to="/" className="flex items-baseline gap-1.5 text-black dark:text-white" aria-label="Flatmate Finder home">
      <span className="font-display text-2xl leading-none tracking-tight">flatmate<span className="text-sand-400">.</span></span>
      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">finder</span>
    </Link>
  );
}

/** Count pill inside a nav link; inverts when the link is active (black pill on black would vanish). */
function NavCount({ count, active, label }) {
  if (!count) return null;
  return (
    <span
      className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none ${
        active ? 'bg-white text-black dark:bg-black dark:text-white' : 'bg-black text-white dark:bg-white dark:text-black'
      }`}
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function AppLinks() {
  const conversations = useConversations({ refetchOnWindowFocus: true });
  const connections = useConnections();
  const unread = conversations.data?.reduce((n, c) => n + c.unread, 0) ?? 0;
  const requests = connections.data?.incoming.length ?? 0;

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <NavLink to="/browse" className={navClass}>Browse</NavLink>
      <NavLink to="/connections" className={navClass}>
        {({ isActive }) => <>Connections<NavCount count={requests} active={isActive} label={`${requests} pending requests`} /></>}
      </NavLink>
      <NavLink to="/inbox" className={navClass}>
        {({ isActive }) => <>Inbox<NavCount count={unread} active={isActive} label={`${unread} unread messages`} /></>}
      </NavLink>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-3">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-neutral-200/80 bg-white/75 pl-6 pr-2 shadow-card backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/75">
        <Logo />
        {user ? (
          <div className="flex items-center gap-1">
            {user.hasProfile && <AppLinks />}
            <Link to={user.hasProfile ? '/me' : '/onboarding'} className="ml-2 rounded-full" aria-label="Your profile">
              <Avatar name={user.name} size="sm" />
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out" className="!px-3">
              <LogOut size={16} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button>
            <Button as={Link} to="/register" size="sm">Get started</Button>
          </div>
        )}
      </nav>
    </header>
  );
}
