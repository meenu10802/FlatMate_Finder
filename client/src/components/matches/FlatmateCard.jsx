import { Link } from 'react-router-dom';
import { BedDouble, CalendarDays, MapPin, Wallet } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { CleanlinessMeter } from '../profile/ProfileDetail.jsx';
import { LIFESTYLE_FIELDS, optionFor } from '../../lib/constants.js';
import { formatDate, formatINRShort, formatKm } from '../../lib/format.js';

/** Result card on Browse. `originName` is where the distance is measured from. */
export default function FlatmateCard({ flatmate: f, originName }) {
  const where = [f.area?.name, f.city?.name].filter(Boolean).join(', ');
  const sameSpot = f.distanceKm === 0;

  return (
    <Link
      to={`/profiles/${f.userId}`}
      className="group flex flex-col rounded-[28px] border border-sand-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-black hover:shadow-lift dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={f.name} src={f.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight">
              {f.name}{f.age && <span className="font-medium text-neutral-500">, {f.age}</span>}
            </p>
            {f.occupation && <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">{f.occupation}</p>}
          </div>
        </div>

        {/* Distance — the headline number on every card */}
        <div className="shrink-0 rounded-2xl bg-black px-3 py-2 text-right text-white dark:bg-white dark:text-black"
          title={`${formatKm(f.distanceKm)} from ${originName}`}>
          <p className="font-display text-xl leading-none">{formatKm(f.distanceKm)}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500">{sameSpot ? 'same area' : 'away'}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-dashed border-sand-300 pt-4 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
        <p className="flex items-center gap-2"><MapPin size={14} className="shrink-0 text-neutral-500" /> {where}</p>
        <p className="flex items-center gap-2"><Wallet size={14} className="shrink-0 text-neutral-500" /> {formatINRShort(f.budgetMin)} – {formatINRShort(f.budgetMax)} / month</p>
        <p className="flex items-center gap-2"><CalendarDays size={14} className="shrink-0 text-neutral-500" /> Moves in {formatDate(f.moveInDate, { day: 'numeric', month: 'short' })}</p>
        {f.hasRoom && <p className="flex items-center gap-2 font-semibold"><BedDouble size={14} className="shrink-0" /> Has a room to share</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {LIFESTYLE_FIELDS.map(({ key, title, options }) => (
          <StatusBadge key={key} value={f[key]}>{title}: {optionFor(options, f[key])?.label}</StatusBadge>
        ))}
      </div>
      <div className="mt-4">
        <CleanlinessMeter level={f.cleanliness} />
      </div>
    </Link>
  );
}

export function FlatmateCardSkeleton() {
  return (
    <div className="h-[300px] animate-pulse rounded-[28px] border border-sand-200 bg-white/60 p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-sand-200 dark:bg-neutral-800" />
        <div className="space-y-2"><div className="h-3 w-28 rounded bg-sand-200 dark:bg-neutral-800" /><div className="h-3 w-20 rounded bg-sand-200 dark:bg-neutral-800" /></div>
      </div>
    </div>
  );
}
