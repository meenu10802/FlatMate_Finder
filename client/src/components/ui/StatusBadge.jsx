import { STATUS_DOTS, STATUS_TONES, STATUS_TONES_ON_DARK, toneFor } from '../../lib/statusColor.js';

/**
 * Small status indicator. The only component allowed to render red/green/yellow.
 * Pass `value` (e.g. 'flexible', 'pending', 'conflict') or an explicit `tone`.
 * Use `onDark` when the badge sits on a black surface.
 */
export default function StatusBadge({ value, tone, onDark = false, children, className = '' }) {
  const t = tone ?? toneFor(value);
  const tones = onDark ? STATUS_TONES_ON_DARK : STATUS_TONES;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${tones[t]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[t]}`} aria-hidden="true" />
      {children ?? value}
    </span>
  );
}
