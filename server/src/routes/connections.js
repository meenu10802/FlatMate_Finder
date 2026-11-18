import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as Connections from '../services/connectionService.js';

const router = Router();
router.use(requireAuth);

const id = z.coerce.number().int().positive();

router.get('/', async (req, res) => {
  res.json(await Connections.list(req.userId));
});

// Status between me and one user (drives the Connect button on profiles). `connection` is null if none.
router.get('/with/:userId', validate({ params: z.object({ userId: id }) }), async (req, res) => {
  res.json({ connection: await Connections.withUser(req.userId, req.params.userId) });
});

router.post('/', validate({ body: z.object({ addresseeId: id }) }), async (req, res) => {
  const connection = await Connections.request(req.userId, req.body.addresseeId);
  res.status(201).json({ connection });
});

router.patch(
  '/:id',
  validate({ params: z.object({ id }), body: z.object({ status: z.enum(['accepted', 'declined']) }) }),
  async (req, res) => {
    res.json({ connection: await Connections.respond(req.userId, req.params.id, req.body.status) });
  }
);

export default router;
