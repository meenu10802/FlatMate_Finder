import { STATUS_DOTS, STATUS_TONES, toneFor } from '../../lib/statusColor.js';

/**
 * Small status indicator. The only component allowed to render red/green/yellow.
 * Pass `value` (e.g. 'flexible', 'pending', 'conflict') or an explicit `tone`.
 */
export default function StatusBadge({ value, tone, children, className = '' }) {
  const t = tone ?? toneFor(value);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONES[t]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[t]}`} aria-hidden="true" />
      {children ?? value}
    </span>
  );
}
