import { Router } from 'express';
import * as Profiles from '../services/profileService.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileSchema, userIdParams } from '../validators/profileSchemas.js';

const router = Router();
router.use(requireAuth);

router.get('/me', async (req, res) => {
  res.json({ profile: await Profiles.getOwn(req.userId) });
});

router.put('/me', validate({ body: profileSchema }), async (req, res) => {
  res.json({ profile: await Profiles.save(req.userId, req.body) });
});

router.get('/:userId', validate({ params: userIdParams }), async (req, res) => {
  res.json({ profile: await Profiles.getPublic(req.params.userId) });
});

export default router;
