import { BedDouble, CalendarDays, MapPin, Radius, Search, Wallet } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import MatchBreakdown from '../matches/MatchBreakdown.jsx';
import { CLEANLINESS_LABELS, LIFESTYLE_FIELDS, optionFor } from '../../lib/constants.js';
import { formatDate, formatINR, relativeDays } from '../../lib/format.js';

function Panel({ className = '', children }) {
  return (
    <div className={`rounded-[28px] border border-neutral-200 bg-white p-6 shadow-card dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      {children}
    </div>
  );
}

export function CleanlinessMeter({ level }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2 w-6 rounded-full ${i <= level ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
        ))}
      </div>
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        {CLEANLINESS_LABELS[level]} <span className="text-neutral-600">· {level}/5</span>
      </span>
    </div>
  );
}

/** Full profile layout. `actions` renders in the header (Edit / Connect buttons). */
/** `match` ({ score, breakdown }) is shown as a "How you match" panel when viewing someone else. */
export default function ProfileDetail({ profile: p, actions, isOwn = false, match = null }) {
  const location = [p.area?.name, p.city?.name].filter(Boolean).join(', ');

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:py-16">
      {/* Header */}
      <section className="flex flex-col gap-8 border-b border-neutral-200 pb-10 dark:border-neutral-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-6">
          <Avatar name={p.name} src={p.avatarUrl} size="xl" className="shadow-lift" />
          <div>
            <Eyebrow>{isOwn ? 'Your profile' : 'Flatmate profile'}</Eyebrow>
            <h1 className="mt-2 font-display text-5xl leading-none tracking-tight sm:text-6xl">
              {p.name}
              {p.age && <span className="text-neutral-500">, {p.age}</span>}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              {p.occupation && <span>{p.occupation}</span>}
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} className="text-neutral-500" /> {location}
                </span>
              )}
              {p.gender && p.gender !== 'Prefer not to say' && <span>{p.gender}</span>}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-xs font-bold text-sand-100 dark:bg-white dark:text-black">
              {p.hasRoom ? <><BedDouble size={13} /> Has a room to share</> : <><Search size={13} /> Looking for a place</>}
            </span>
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Match */}
        {match && (
          <Panel className="lg:col-span-3">
            <Eyebrow>How you match</Eyebrow>
            <div className="mt-6">
              <MatchBreakdown match={match} name={p.name} />
            </div>
          </Panel>
        )}

        {/* Room on offer */}
        {p.hasRoom && (
          <Panel className="overflow-hidden !p-0 lg:col-span-3">
            <div className="grid sm:grid-cols-[1.4fr_1fr]">
              {p.roomPhotoUrl ? (
                <img src={p.roomPhotoUrl} alt={`The room ${p.name} is offering`} referrerPolicy="no-referrer"
                  className="aspect-[16/10] h-full w-full object-cover grayscale transition-[filter] duration-500 hover:grayscale-0" />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-sand-50 text-neutral-600 dark:bg-neutral-950">
                  <BedDouble size={40} />
                </div>
              )}
              <div className="flex flex-col justify-center p-8">
                <Eyebrow>The room</Eyebrow>
                <p className="mt-3 font-display text-3xl leading-tight">
                  {isOwn ? 'You have a room to share' : `${p.name.split(' ')[0]} has a room to share`}
                  {p.area?.name ? ` in ${p.area.name}` : p.city?.name ? ` in ${p.city.name}` : ''}.
                </p>
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {p.roomPhotoUrl ? 'Hover the photo to see it in colour.' : isOwn ? 'Add a room photo from Edit profile to get more requests.' : 'No room photo yet — ask about it once you connect.'}
                </p>
              </div>
            </div>
          </Panel>
        )}

        {/* Bio */}
        <Panel className="lg:col-span-2">
          <Eyebrow>In their words</Eyebrow>
          {p.bio ? (
            <p className="mt-4 whitespace-pre-line font-display text-2xl leading-snug sm:text-3xl">“{p.bio}”</p>
          ) : (
            <p className="mt-4 text-neutral-600">{isOwn ? 'Add a short bio so people know who they’d be living with.' : 'No bio yet.'}</p>
          )}
        </Panel>

        {/* Budget */}
        <Panel className="grain relative overflow-hidden !border-black !bg-black text-white">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            <Wallet size={13} /> Budget / month
          </p>
          <p className="mt-6 font-display text-4xl leading-tight">
            {formatINR(p.budgetMin)}
            <span className="block text-neutral-400">to {formatINR(p.budgetMax)}</span>
          </p>
        </Panel>

        {/* Lifestyle */}
        <Panel className="lg:col-span-2">
          <Eyebrow>Lifestyle</Eyebrow>
          <dl className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {LIFESTYLE_FIELDS.map(({ key, title, options }) => {
              const opt = optionFor(options, p[key]);
              return (
                <div key={key} className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-sm text-neutral-600">{title}</dt>
                  <dd className="flex items-center gap-3">
                    <span className="hidden text-sm text-neutral-600 sm:inline">{opt?.desc}</span>
                    <StatusBadge value={p[key]}>{opt?.label ?? p[key]}</StatusBadge>
                  </dd>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-sm text-neutral-600">Cleanliness</dt>
              <dd><CleanlinessMeter level={p.cleanliness} /></dd>
            </div>
          </dl>
        </Panel>

        {/* Move-in + area */}
        <div className="grid gap-6">
          <Panel>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-600">
              <CalendarDays size={13} /> Move-in
            </p>
            <p className="mt-4 font-display text-4xl leading-none">{formatDate(p.moveInDate, { day: 'numeric', month: 'short' })}</p>
            <p className="mt-2 text-sm text-neutral-600">{formatDate(p.moveInDate, { year: 'numeric' })} · {relativeDays(p.moveInDate)}</p>
          </Panel>
          <Panel>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-600">
              <Radius size={13} /> Search area
            </p>
            <p className="mt-4 font-display text-4xl leading-none">{p.searchRadiusKm} km</p>
            <p className="mt-2 text-sm text-neutral-600">around {p.area?.name ?? `central ${p.city?.name ?? 'city'}`}</p>
          </Panel>
        </div>
      </div>
    </main>
  );
}

export function ProfileSkeleton() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse px-4 py-16" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-end gap-6 border-b border-neutral-200 pb-10 dark:border-neutral-800">
        <div className="h-28 w-28 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-12 w-72 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="h-48 rounded-[28px] bg-neutral-100 lg:col-span-2 dark:bg-neutral-900" />
        <div className="h-48 rounded-[28px] bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </main>
  );
}
