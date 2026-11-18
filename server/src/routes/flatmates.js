import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as Profiles from '../models/profileModel.js';
import * as Flatmates from '../models/flatmateModel.js';
import { RADIUS_LIMITS, resolveOrigin } from '../services/locationService.js';

const router = Router();
router.use(requireAuth);

const id = z.coerce.number().int().positive();

const searchQuery = z.object({
  cityId: id.optional(),
  areaId: id.optional(),
  radiusKm: z.coerce.number().int().min(RADIUS_LIMITS.min).max(RADIUS_LIMITS.max).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

/**
 * GET /api/flatmates?cityId&areaId&radiusKm&page&limit
 * Flatmates within radiusKm (1–25) of the chosen neighbourhood / city centre, nearest first,
 * each with `distanceKm` (1 dp). Defaults come from the viewer's own profile.
 */
router.get('/', validate({ query: searchQuery }), async (req, res) => {
  const q = req.validatedQuery;
  const me = await Profiles.findByUserId(req.userId);
  const origin = await resolveOrigin({ areaId: q.areaId, cityId: q.cityId }, me);
  const radiusKm = q.radiusKm ?? me?.searchRadiusKm ?? RADIUS_LIMITS.default;

  const { rows, total } = await Flatmates.searchByDistance({
    origin,
    radiusKm,
    excludeUserId: req.userId,
    limit: q.limit,
    offset: (q.page - 1) * q.limit,
  });

  res.json({
    flatmates: rows,
    origin,
    radiusKm,
    page: q.page,
    limit: q.limit,
    total,
    hasMore: q.page * q.limit < total,
  });
});

export default router;
