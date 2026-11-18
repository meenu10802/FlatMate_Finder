/**
 * The ONLY place status accent colors are defined (CLAUDE.md §6).
 * Everything else in the UI is black / white / neutral.
 */
export const STATUS_TONES = {
  ok: 'text-status-ok bg-status-ok/10 border-status-ok/30',
  warn: 'text-status-warn bg-status-warn/10 border-status-warn/30',
  bad: 'text-status-bad bg-status-bad/10 border-status-bad/30',
  neutral: 'text-neutral-600 bg-neutral-100 border-neutral-200 dark:text-neutral-300 dark:bg-neutral-900 dark:border-neutral-800',
};

export const STATUS_DOTS = {
  ok: 'bg-status-ok',
  warn: 'bg-status-warn',
  bad: 'bg-status-bad',
  neutral: 'bg-neutral-400',
};

// Maps any domain value to a tone.
const VALUE_TONE = {
  // lifestyle preferences
  yes: 'ok',
  flexible: 'ok',
  occasionally: 'warn',
  no: 'bad',
  // match breakdown
  match: 'ok',
  partial: 'warn',
  conflict: 'bad',
  // connections
  accepted: 'ok',
  pending: 'warn',
  declined: 'bad',
};

export function toneFor(value) {
  return VALUE_TONE[value] ?? 'neutral';
}
