import { usePageTitle } from '../hooks/usePageTitle.js';
import { Link } from 'react-router-dom';
import { Check, MessageSquare, X } from 'lucide-react';
import { useConnections, useRespondToConnection } from '../api/connections.js';
import { useSocket } from '../hooks/useSocket.js';
import Button from '../components/ui/Button.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { PresenceAvatar } from '../components/messages/Presence.jsx';
import ErrorState from '../components/layout/ErrorState.jsx';

function Person({ user, online, children }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <Link to={`/profiles/${user.id}`} className="flex min-w-0 items-center gap-3">
        {online === undefined ? <Avatar name={user.name} src={user.avatarUrl} /> : <PresenceAvatar name={user.name} src={user.avatarUrl} online={online} />}
        <span className="min-w-0">
          <span className="block truncate font-bold hover:underline">{user.name}{user.age ? `, ${user.age}` : ''}</span>
          <span className="block truncate text-sm text-neutral-600">{[user.occupation, user.location].filter(Boolean).join(' · ')}</span>
        </span>
      </Link>
      <div className="flex gap-2">{children}</div>
    </li>
  );
}

function Section({ title, count, empty, children }) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <h2 className="font-bold">{title}</h2>
        <span className="text-sm text-neutral-600">{count}</span>
      </header>
      {count ? <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">{children}</ul> : <p className="px-5 py-8 text-sm text-neutral-600">{empty}</p>}
    </section>
  );
}

export default function Connections() {
  usePageTitle('Connections');
  const { data, isLoading, error, refetch } = useConnections();
  const respond = useRespondToConnection();
  const { isOnline } = useSocket();

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:py-14">
      <Eyebrow>Your network</Eyebrow>
      <h1 className="mt-3 font-display text-5xl sm:text-6xl">Connections</h1>

      {isLoading ? (
        <p className="mt-10 text-neutral-600">Loading…</p>
      ) : (
        <div className="mt-10 space-y-6">
          <Section title="Requests for you" count={data.incoming.length} empty="No pending requests.">
            {data.incoming.map((c) => (
              <Person key={c.id} user={c.user}>
                <Button size="sm" onClick={() => respond.mutate({ id: c.id, status: 'accepted' })} disabled={respond.isPending}>
                  <Check size={15} /> Accept
                </Button>
                <Button size="sm" variant="secondary" onClick={() => respond.mutate({ id: c.id, status: 'declined' })} disabled={respond.isPending}>
                  <X size={15} /> Decline
                </Button>
              </Person>
            ))}
          </Section>

          <Section title="Connected" count={data.accepted.length} empty="No connections yet — find people on Browse and tap Connect.">
            {data.accepted.map((c) => (
              <Person key={c.id} user={c.user} online={isOnline(c.user.id)}>
                <Button as={Link} to={`/inbox/${c.id}`} size="sm" variant="secondary">
                  <MessageSquare size={15} /> Message
                </Button>
              </Person>
            ))}
          </Section>

          <Section title="Sent" count={data.outgoing.length} empty="No requests waiting on a reply.">
            {data.outgoing.map((c) => (
              <Person key={c.id} user={c.user}>
                <span className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-600">Waiting</span>
              </Person>
            ))}
          </Section>
        </div>
      )}
    </main>
  );
}
