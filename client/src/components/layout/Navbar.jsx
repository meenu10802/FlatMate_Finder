import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
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

const mobileClass = ({ isActive }) =>
  `flex items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
    isActive ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
  }`;

export function Logo() {
  return (
    <Link to="/" className="flex items-baseline gap-1.5 text-black dark:text-white" aria-label="Flatmate Finder home">
      <span className="font-display text-2xl leading-none tracking-tight">flatmate<span className="text-sand-400">.</span></span>
      <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">finder</span>
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
    >
      {count > 99 ? '99+' : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

/** Unread messages + pending requests, for both desktop and mobile nav. */
function useNavCounts(enabled) {
  const conversations = useConversations({ refetchOnWindowFocus: true, enabled });
  const connections = useConnections({ enabled });
  return {
    unread: conversations.data?.reduce((n, c) => n + c.unread, 0) ?? 0,
    requests: connections.data?.incoming.length ?? 0,
  };
}

const LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/connections', label: 'Connections', count: 'requests', countLabel: 'pending requests' },
  { to: '/inbox', label: 'Inbox', count: 'unread', countLabel: 'unread messages' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const inApp = Boolean(user?.hasProfile);
  const counts = useNavCounts(inApp);
  const totalBadge = counts.unread + counts.requests;

  // Close the mobile menu on navigation, Escape, or a click outside.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-3">
      <nav aria-label="Main" className="relative mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-neutral-200/80 bg-white/75 pl-6 pr-2 shadow-card backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/75">
        <Logo />
        {user ? (
          <div className="flex items-center gap-1">
            {inApp && (
              <div className="hidden items-center gap-1 sm:flex">
                {LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to} className={navClass}>
                    {({ isActive }) => (
                      <>
                        {l.label}
                        {l.count && <NavCount count={counts[l.count]} active={isActive} label={l.countLabel} />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
            <Link to={inApp ? '/me' : '/onboarding'} className="ml-2 hidden rounded-full sm:block" aria-label="Your profile">
              <Avatar name={user.name} size="sm" />
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out" className="hidden !px-3 sm:inline-flex">
              <LogOut size={16} />
            </Button>

            {/* Mobile menu button */}
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : `Open menu${totalBadge ? `, ${totalBadge} new` : ''}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 sm:hidden dark:hover:bg-neutral-800"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
              {!open && totalBadge > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-black ring-2 ring-white dark:bg-white dark:ring-neutral-950" aria-hidden="true" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button>
            <Button as={Link} to="/register" size="sm">Get started</Button>
          </div>
        )}

        {user && open && (
          <div
            id="mobile-menu"
            ref={menuRef}
            className="absolute inset-x-0 top-[calc(100%+0.5rem)] animate-rise rounded-[28px] border border-neutral-200 bg-white p-3 shadow-lift sm:hidden dark:border-neutral-800 dark:bg-neutral-900"
          >
            <Link to={inApp ? '/me' : '/onboarding'} className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Avatar name={user.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-bold">{user.name}</span>
                <span className="block text-sm text-neutral-600">{inApp ? 'View your profile' : 'Finish your profile'}</span>
              </span>
            </Link>
            {inApp && (
              <ul className="mt-1 space-y-1 border-t border-neutral-200 pt-2 dark:border-neutral-800">
                {LINKS.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to} className={mobileClass}>
                      {({ isActive }) => (
                        <>
                          {l.label}
                          {l.count && <NavCount count={counts[l.count]} active={isActive} label={l.countLabel} />}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-2 rounded-2xl border-t border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
