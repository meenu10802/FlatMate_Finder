import { Link } from 'react-router-dom';
import { BedDouble, CalendarDays, MapPin, Wallet } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import MatchScoreRing from './MatchScoreRing.jsx';
import { BreakdownChips } from './MatchBreakdown.jsx';
import { formatDate, formatINRShort, formatKm } from '../../lib/format.js';

/** Result card on Browse: match score ring, exact distance, key facts and the 7-factor breakdown. */
export default function FlatmateCard({ flatmate: f, originName }) {
  const where = [f.area?.name, f.city?.name].filter(Boolean).join(', ');

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
              {f.name}{f.age && <span className="font-medium text-neutral-600">, {f.age}</span>}
            </p>
            {f.occupation && <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">{f.occupation}</p>}
          </div>
        </div>
        {f.score != null && <MatchScoreRing score={f.score} size={64} className="shrink-0" />}
      </div>

      <div className="mt-5 space-y-2 border-t border-dashed border-sand-300 pt-4 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
        <p className="flex items-center gap-2" title={`${formatKm(f.distanceKm)} from ${originName}`}>
          <MapPin size={14} className="shrink-0 text-neutral-600" />
          <span className="font-bold text-black dark:text-white">{formatKm(f.distanceKm)}</span>
          <span className="truncate text-neutral-600">· {f.distanceKm === 0 ? 'same area · ' : ''}{where}</span>
        </p>
        <p className="flex items-center gap-2"><Wallet size={14} className="shrink-0 text-neutral-600" /> {formatINRShort(f.budgetMin)} – {formatINRShort(f.budgetMax)} / month</p>
        <p className="flex items-center gap-2"><CalendarDays size={14} className="shrink-0 text-neutral-600" /> Moves in {formatDate(f.moveInDate, { day: 'numeric', month: 'short' })}</p>
        {f.hasRoom && <p className="flex items-center gap-2 font-semibold"><BedDouble size={14} className="shrink-0" /> Has a room to share</p>}
      </div>

      {f.breakdown?.length > 0 && (
        <div className="mt-4">
          <BreakdownChips breakdown={f.breakdown} />
        </div>
      )}
    </Link>
  );
}

export function FlatmateCardSkeleton() {
  return (
    <div className="h-[290px] animate-pulse rounded-[28px] border border-sand-200 bg-white/60 p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-sand-200 dark:bg-neutral-800" />
          <div className="space-y-2"><div className="h-3 w-28 rounded bg-sand-200 dark:bg-neutral-800" /><div className="h-3 w-20 rounded bg-sand-200 dark:bg-neutral-800" /></div>
        </div>
        <div className="h-16 w-16 rounded-full border-[5px] border-sand-200 dark:border-neutral-800" />
      </div>
    </div>
  );
}
