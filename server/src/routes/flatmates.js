import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as Profiles from '../models/profileModel.js';
import * as Flatmates from '../models/flatmateModel.js';
import { RADIUS_LIMITS, resolveOrigin } from '../services/locationService.js';
import { computeMatch } from '../services/matchService.js';
import { PARTIES, PETS, SMOKING } from '../validators/profileSchemas.js';

const router = Router();
router.use(requireAuth);

const id = z.coerce.number().int().positive();

/** Accepts `?smoking=no,flexible` or `?smoking=no&smoking=flexible`; de-duplicated. */
const multi = (values) =>
  z
    .preprocess((v) => (v == null || v === '' ? undefined : [...new Set((Array.isArray(v) ? v : String(v).split(',')).filter(Boolean))]), z.array(z.enum(values)).optional());

const bool = z.enum(['true', 'false']).transform((v) => v === 'true').optional();

export const SORTS = ['match', 'distance', 'moveIn'];

const searchQuery = z.object({
  cityId: id.optional(),
  areaId: id.optional(),
  radiusKm: z.coerce.number().int().min(RADIUS_LIMITS.min).max(RADIUS_LIMITS.max).optional(),
  smoking: multi(SMOKING),
  pets: multi(PETS),
  parties: multi(PARTIES),
  budgetMax: z.coerce.number().int().min(0).max(10_000_000).optional(),
  moveInBefore: z.iso.date().optional(),
  hasRoom: bool,
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(SORTS).default('match'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

const SORTERS = {
  match: (a, b) => (b.score ?? -1) - (a.score ?? -1) || a.distanceKm - b.distanceKm,
  distance: (a, b) => a.distanceKm - b.distanceKm || (b.score ?? -1) - (a.score ?? -1),
  moveIn: (a, b) => a.moveInDate.localeCompare(b.moveInDate) || a.distanceKm - b.distanceKm,
};

/**
 * GET /api/flatmates
 * Location: cityId / areaId / radiusKm (1–25) — distance via Haversine in MySQL, `distanceKm` on every result.
 * Preference filters: smoking, pets, parties (multi), budgetMax, moveInBefore, hasRoom.
 * Match: every result gets `score` (0–100) + `breakdown` vs. the viewer's profile; filter with minScore, sort=match|distance|moveIn.
 */
router.get('/', validate({ query: searchQuery }), async (req, res) => {
  const q = req.validatedQuery;
  const me = await Profiles.findByUserId(req.userId, { withCoords: true });
  const origin = await resolveOrigin({ areaId: q.areaId, cityId: q.cityId }, me);
  const radiusKm = q.radiusKm ?? me?.searchRadiusKm ?? RADIUS_LIMITS.default;

  const candidates = await Flatmates.searchByDistance({
    origin,
    radiusKm,
    excludeUserId: req.userId,
    filters: { smoking: q.smoking, pets: q.pets, parties: q.parties, budgetMax: q.budgetMax, moveInBefore: q.moveInBefore, hasRoom: q.hasRoom },
  });

  const canScore = Boolean(me?.coords);
  let results = candidates.map(({ coords, ...f }) => {
    const match = canScore && coords ? computeMatch(me, { ...f, coords }) : { score: null, breakdown: [] };
    return { ...f, ...match };
  });
  if (q.minScore != null && canScore) results = results.filter((f) => f.score >= q.minScore);
  results.sort(SORTERS[q.sort]);

  const total = results.length;
  const start = (q.page - 1) * q.limit;
  res.json({
    flatmates: results.slice(start, start + q.limit),
    origin,
    radiusKm,
    sort: q.sort,
    page: q.page,
    limit: q.limit,
    total,
    hasMore: start + q.limit < total,
  });
});

export default router;
