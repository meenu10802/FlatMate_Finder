import { Router } from 'express';
import { z } from 'zod';
import * as Locations from '../models/locationModel.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';

const router = Router();

// Location data is public and rarely changes.
const cache = (res) => res.set('Cache-Control', 'public, max-age=3600');

router.get('/cities', async (req, res) => {
  cache(res);
  res.json({ cities: await Locations.listCities() });
});

router.get(
  '/cities/:id/areas',
  validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  async (req, res) => {
    if (!(await Locations.findCity(req.params.id))) throw new HttpError(404, 'NOT_FOUND', 'City not found');
    cache(res);
    res.json({ areas: await Locations.listAreas(req.params.id) });
  }
);

export default router;
