const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatINR = (n) => (n == null || n === '' ? '—' : inr.format(Number(n)));

export function formatINRShort(n) {
  const v = Number(n);
  if (v >= 100000) return `₹${+(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${+(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
}

/** Distance from the API (km, 1 dp) → "2.1 km". Always one decimal so cards line up. */
export const formatKm = (km) => (km == null ? '—' : `${Number(km).toFixed(1)} km`);

/* ── Chat timestamps (ISO-8601 UTC strings from the API) ── */

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const formatClock = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Inbox list: "14:05" today, "Yesterday", weekday this week, else "12 Nov". */
export function formatThreadTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return formatClock(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  if (now - d < 6 * 86400000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Day separator inside a chat: "Today", "Yesterday", "Mon, 12 Nov". */
export function formatDayLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export const dayKey = (iso) => new Date(iso).toDateString();

/** 'YYYY-MM-DD' → Date at local midnight (avoids UTC off-by-one). */
export function parseISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = parseISODate(s);
  return d ? d.toLocaleDateString('en-IN', opts) : '—';
}

export function daysFromToday(s) {
  const d = parseISODate(s);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export function relativeDays(s) {
  const n = daysFromToday(s);
  if (n == null) return '';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1) return `in ${n} days`;
  return 'available now';
}
