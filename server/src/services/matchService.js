/**
 * Match score — pure functions, no DB (see CLAUDE.md §4).
 * score = round(Σ weight × factorScore), factorScore ∈ [0, 1], weights sum to 100.
 */
import { haversineKm } from './locationService.js';

export const WEIGHTS = { budget: 20, smoking: 15, pets: 15, parties: 15, cleanliness: 15, moveIn: 10, location: 10 };
export const LABELS = { budget: 'Budget', smoking: 'Smoking', pets: 'Pets', parties: 'Parties', cleanliness: 'Cleanliness', moveIn: 'Move-in', location: 'Location' };

export const statusFor = (s) => (s >= 0.85 ? 'match' : s >= 0.35 ? 'partial' : 'conflict');

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const DAY = 86400000;
const parseDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/* ── Factor rules ─────────────────────────────────────────── */

/** Smoking / pets: no | yes | flexible. */
export function yesNoFlexible(a, b) {
  if (a === b) return 1;
  if (a === 'flexible' || b === 'flexible') return 0.7;
  return 0; // yes vs no
}

/** Parties: no | occasionally | flexible. */
export function parties(a, b) {
  if (a === b) return 1;
  if (a === 'flexible' || b === 'flexible') return 0.7;
  return 0.4; // occasionally vs no
}

export const cleanliness = (a, b) => 1 - Math.abs(a - b) / 4;

/** Overlap of two [min, max] ranges ÷ the smaller range's length. Zero-width ranges score 1 if they intersect. */
export function budget(aMin, aMax, bMin, bMax) {
  const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
  if (overlap < 0) return 0;
  const smaller = Math.min(aMax - aMin, bMax - bMin);
  if (smaller === 0) return 1;
  return Math.min(1, overlap / smaller);
}

/** ≤ 14 days apart → 1, linear to 0 at 90 days. */
export function moveIn(aDate, bDate) {
  const days = Math.abs(parseDate(aDate) - parseDate(bDate)) / DAY;
  if (days <= 14) return 1;
  if (days >= 90) return 0;
  return 1 - (days - 14) / (90 - 14);
}

/** Same area → 1; else linear from 1 at 0 km to 0 at the viewer's radius. */
export function location(distanceKm, radiusKm, sameArea) {
  if (sameArea) return 1;
  if (distanceKm >= radiusKm) return 0;
  return 1 - distanceKm / radiusKm;
}

/* ── Human-readable detail for each factor ────────────────── */

const PREF_TEXT = {
  smoking: { no: 'smoke-free', yes: 'a smoker', flexible: 'easygoing about smoking' },
  pets: { no: 'pet-free', yes: 'pet friendly', flexible: 'easygoing about pets' },
  parties: { no: 'into a quiet home', occasionally: 'up for the odd gathering', flexible: 'easygoing about parties' },
};

function prefDetail(key, mine, theirs) {
  if (mine === theirs) return `You’re both ${PREF_TEXT[key][mine]}`;
  return `You’re ${PREF_TEXT[key][mine]}; they’re ${PREF_TEXT[key][theirs]}`;
}

/**
 * Score `candidate` for `viewer`. Both are profile objects (API shape) with, for location,
 * `coords: { lat, lng }` (area centre, or city centre if no area).
 */
export function computeMatch(viewer, candidate) {
  const distanceKm = haversineKm(viewer.coords.lat, viewer.coords.lng, candidate.coords.lat, candidate.coords.lng);
  const sameArea = Boolean(viewer.area?.id && viewer.area.id === candidate.area?.id);
  const radius = viewer.searchRadiusKm || 5;
  const dayGap = Math.round(Math.abs(parseDate(viewer.moveInDate) - parseDate(candidate.moveInDate)) / DAY);
  const overlapAmt = Math.max(0, Math.min(viewer.budgetMax, candidate.budgetMax) - Math.max(viewer.budgetMin, candidate.budgetMin));
  const budgetsTouch = Math.min(viewer.budgetMax, candidate.budgetMax) >= Math.max(viewer.budgetMin, candidate.budgetMin);
  const cleanGap = Math.abs(viewer.cleanliness - candidate.cleanliness);

  const raw = {
    budget: [budget(viewer.budgetMin, viewer.budgetMax, candidate.budgetMin, candidate.budgetMax),
      budgetsTouch ? (overlapAmt ? `Budgets overlap by ${inr.format(overlapAmt)}` : 'Budgets just meet') : `No overlap — they’re ${inr.format(candidate.budgetMin)}–${inr.format(candidate.budgetMax)}`],
    smoking: [yesNoFlexible(viewer.smoking, candidate.smoking), prefDetail('smoking', viewer.smoking, candidate.smoking)],
    pets: [yesNoFlexible(viewer.pets, candidate.pets), prefDetail('pets', viewer.pets, candidate.pets)],
    parties: [parties(viewer.parties, candidate.parties), prefDetail('parties', viewer.parties, candidate.parties)],
    cleanliness: [cleanliness(viewer.cleanliness, candidate.cleanliness),
      cleanGap === 0 ? `Same tidiness level (${candidate.cleanliness}/5)` : `${cleanGap} step${cleanGap > 1 ? 's' : ''} apart (you ${viewer.cleanliness}/5, they ${candidate.cleanliness}/5)`],
    moveIn: [moveIn(viewer.moveInDate, candidate.moveInDate), dayGap === 0 ? 'Same move-in day' : `Move-in dates ${dayGap} day${dayGap > 1 ? 's' : ''} apart`],
    location: [location(distanceKm, radius, sameArea),
      sameArea ? 'Same neighbourhood' : `${(Math.round(distanceKm * 10) / 10).toFixed(1)} km from you (your radius: ${radius} km)`],
  };

  const breakdown = Object.entries(raw).map(([factor, [s, detail]]) => {
    const score = Math.round(s * 1000) / 1000;
    return {
      factor,
      label: LABELS[factor],
      score,
      weight: WEIGHTS[factor],
      points: Math.round(score * WEIGHTS[factor] * 10) / 10,
      status: statusFor(score),
      detail,
    };
  });

  const total = Math.round(breakdown.reduce((sum, b) => sum + b.score * b.weight, 0));
  return { score: total, breakdown };
}
