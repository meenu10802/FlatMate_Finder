import { Router } from 'express';
import * as Profiles from '../services/profileService.js';
import * as ProfileModel from '../models/profileModel.js';
import { computeMatch } from '../services/matchService.js';
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

// Another user's profile, plus `match` ({ score, breakdown } vs. my profile, or null if I have none yet).
router.get('/:userId', validate({ params: userIdParams }), async (req, res) => {
  const profile = await Profiles.getPublic(req.params.userId);
  const [me, them] = await Promise.all([
    ProfileModel.findByUserId(req.userId, { withCoords: true }),
    ProfileModel.findByUserId(req.params.userId, { withCoords: true }),
  ]);
  const match = me?.coords && them?.coords && me.userId !== them.userId ? computeMatch(me, them) : null;
  res.json({ profile, match });
});

export default router;
