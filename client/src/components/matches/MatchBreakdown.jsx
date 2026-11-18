import StatusBadge from '../ui/StatusBadge.jsx';
import MatchScoreRing from './MatchScoreRing.jsx';

const STATUS_LABEL = { match: 'Match', partial: 'Partial', conflict: 'Conflict' };

/** Compact chips for cards: one StatusBadge per factor. */
export function BreakdownChips({ breakdown }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Match breakdown">
      {breakdown.map((b) => (
        <li key={b.factor}>
          <StatusBadge value={b.status} className="!text-[12px]">
            <span className="sr-only">{STATUS_LABEL[b.status]}: </span>{b.label}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}

/** Full "How you match" panel for profile pages. */
export default function MatchBreakdown({ match, name }) {
  const counts = match.breakdown.reduce((acc, b) => ({ ...acc, [b.status]: (acc[b.status] ?? 0) + 1 }), {});
  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr] md:items-center">
      <div className="flex flex-col items-center text-center">
        <MatchScoreRing score={match.score} size={150} stroke={9} />
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          You and {name.split(' ')[0]} match on{' '}
          <span className="font-bold text-black dark:text-white">{counts.match ?? 0} of 7</span> factors
        </p>
      </div>

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {match.breakdown.map((b) => (
          <li key={b.factor} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[110px_1fr_auto]">
            <span className="font-bold">{b.label}</span>
            <span className="order-3 col-span-2 text-sm text-neutral-600 sm:order-none sm:col-span-1 dark:text-neutral-400">{b.detail}</span>
            <span className="flex items-center gap-3">
              <span className="hidden w-20 sm:block" aria-hidden="true">
                <span className="block h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <span className="block h-full rounded-full bg-black dark:bg-white" style={{ width: `${b.score * 100}%` }} />
                </span>
              </span>
              <span className="w-12 text-right text-sm font-bold tabular-nums">
                {Number.isInteger(b.points) ? b.points : b.points.toFixed(1)}<span className="font-medium text-neutral-600">/{b.weight}</span>
              </span>
              <StatusBadge value={b.status}>{STATUS_LABEL[b.status]}</StatusBadge>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
