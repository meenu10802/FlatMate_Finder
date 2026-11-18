/**
 * The ONLY place status accent colors are defined (CLAUDE.md §6).
 * Everything else in the UI is black / white / neutral.
 */
// Badge = dark "ink" text on a 10% tint (AA contrast); the bright hue lives in the tint, border and dot.
export const STATUS_TONES = {
  ok: 'text-status-ok-ink bg-status-ok/10 border-status-ok/30 dark:text-status-ok-glow',
  warn: 'text-status-warn-ink bg-status-warn/10 border-status-warn/40 dark:text-status-warn-glow',
  bad: 'text-status-bad-ink bg-status-bad/10 border-status-bad/30 dark:text-status-bad-glow',
  neutral: 'text-neutral-700 bg-neutral-100 border-neutral-200 dark:text-neutral-300 dark:bg-neutral-900 dark:border-neutral-800',
};

// Same badges for use on black surfaces (e.g. landing feature tiles).
export const STATUS_TONES_ON_DARK = {
  ok: 'text-status-ok-glow bg-status-ok/15 border-status-ok/40',
  warn: 'text-status-warn-glow bg-status-warn/15 border-status-warn/40',
  bad: 'text-status-bad-glow bg-status-bad/15 border-status-bad/40',
  neutral: 'text-neutral-300 bg-neutral-900 border-neutral-700',
};

export const STATUS_DOTS = {
  ok: 'bg-status-ok',
  warn: 'bg-status-warn',
  bad: 'bg-status-bad',
  neutral: 'bg-neutral-400',
};

export const STATUS_TEXT = {
  ok: 'text-status-ok-ink dark:text-status-ok-glow',
  warn: 'text-status-warn-ink dark:text-status-warn-glow',
  bad: 'text-status-bad-ink dark:text-status-bad-glow',
  neutral: 'text-neutral-600',
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
  // presence (offline = neutral gray)
  online: 'ok',
  offline: 'neutral',
  // password strength
  good: 'ok',
  medium: 'warn',
  weak: 'bad',
};

export function toneFor(value) {
  return VALUE_TONE[value] ?? 'neutral';
}
