import { PARTIES_OPTIONS, PETS_OPTIONS, SMOKING_OPTIONS } from './constants.js';
import { formatINRShort, toISODate } from './format.js';

/** Browse preference filters ↔ URL search params ↔ API query. One place for all three. */

export const PREF_FIELDS = [
  { key: 'smoking', title: 'Smoking', options: SMOKING_OPTIONS },
  { key: 'pets', title: 'Pets', options: PETS_OPTIONS },
  { key: 'parties', title: 'Parties', options: PARTIES_OPTIONS },
];

export const SORT_OPTIONS = [
  { value: 'match', label: 'Best match' },
  { value: 'distance', label: 'Nearest' },
  { value: 'moveIn', label: 'Moving soonest' },
];

export const MIN_SCORE_OPTIONS = [null, 50, 70, 85];
export const BUDGET_OPTIONS = [null, 10000, 20000, 35000, 50000];
export const MOVE_IN_OPTIONS = [
  { value: null, label: 'Any time' },
  { value: '2w', label: '2 weeks', days: 14 },
  { value: '1m', label: '1 month', days: 31 },
  { value: '3m', label: '3 months', days: 92 },
];
export const ROOM_OPTIONS = [
  { value: null, label: 'Everyone' },
  { value: 'true', label: 'Has a room' },
  { value: 'false', label: 'Also looking' },
];

const list = (v) => (v ? v.split(',').filter(Boolean) : []);
const num = (v) => (v == null || v === '' ? null : Number(v));

/** Read preference filters from URLSearchParams. */
export function readPrefs(params) {
  return {
    smoking: list(params.get('smoking')),
    pets: list(params.get('pets')),
    parties: list(params.get('parties')),
    budgetMax: num(params.get('budgetMax')),
    moveIn: params.get('moveIn'),
    hasRoom: params.get('hasRoom'),
    minScore: num(params.get('minScore')),
    sort: params.get('sort') || 'match',
  };
}

/** Write preference filters into URLSearchParams (mutates `p`). Defaults are omitted to keep URLs short. */
export function writePrefs(p, prefs) {
  for (const key of ['smoking', 'pets', 'parties']) if (prefs[key]?.length) p.set(key, prefs[key].join(','));
  if (prefs.budgetMax) p.set('budgetMax', prefs.budgetMax);
  if (prefs.moveIn) p.set('moveIn', prefs.moveIn);
  if (prefs.hasRoom) p.set('hasRoom', prefs.hasRoom);
  if (prefs.minScore) p.set('minScore', prefs.minScore);
  if (prefs.sort && prefs.sort !== 'match') p.set('sort', prefs.sort);
  return p;
}

/** Preference filters → /api/flatmates query params. */
export function prefsToQuery(prefs) {
  const q = { sort: prefs.sort };
  for (const key of ['smoking', 'pets', 'parties']) if (prefs[key]?.length) q[key] = prefs[key].join(',');
  if (prefs.budgetMax) q.budgetMax = prefs.budgetMax;
  const mi = MOVE_IN_OPTIONS.find((o) => o.value === prefs.moveIn);
  if (mi?.days) {
    const d = new Date();
    d.setDate(d.getDate() + mi.days);
    q.moveInBefore = toISODate(d);
  }
  if (prefs.hasRoom) q.hasRoom = prefs.hasRoom;
  if (prefs.minScore) q.minScore = prefs.minScore;
  return q;
}

/** Removable chips for every active filter: [{ key, label, clear: patch }]. */
export function activeChips(prefs) {
  const chips = [];
  for (const { key, title, options } of PREF_FIELDS) {
    for (const v of prefs[key]) {
      chips.push({ key: `${key}:${v}`, label: `${title}: ${options.find((o) => o.value === v)?.label ?? v}`, clear: { [key]: prefs[key].filter((x) => x !== v) } });
    }
  }
  if (prefs.budgetMax) chips.push({ key: 'budget', label: `Budget from ≤ ${formatINRShort(prefs.budgetMax)}`, clear: { budgetMax: null } });
  const mi = MOVE_IN_OPTIONS.find((o) => o.value === prefs.moveIn && o.value);
  if (mi) chips.push({ key: 'moveIn', label: `Moving within ${mi.label}`, clear: { moveIn: null } });
  const room = ROOM_OPTIONS.find((o) => o.value === prefs.hasRoom && o.value);
  if (room) chips.push({ key: 'room', label: room.label, clear: { hasRoom: null } });
  if (prefs.minScore) chips.push({ key: 'minScore', label: `Match ${prefs.minScore}+`, clear: { minScore: null } });
  return chips;
}

export const CLEARED_PREFS = { smoking: [], pets: [], parties: [], budgetMax: null, moveIn: null, hasRoom: null, minScore: null };
