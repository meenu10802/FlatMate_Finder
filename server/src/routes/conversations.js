import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as Messages from '../services/messageService.js';

/** A conversation is identified by its accepted connection's id. Real-time delivery goes over Socket.IO. */
const router = Router();
router.use(requireAuth);

const params = z.object({ connectionId: z.coerce.number().int().positive() });

router.get('/', async (req, res) => {
  res.json({ conversations: await Messages.threads(req.userId) });
});

router.get(
  '/:connectionId/messages',
  validate({
    params,
    query: z.object({
      before: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  }),
  async (req, res) => {
    const { before, limit } = req.validatedQuery;
    res.json(await Messages.history(req.userId, req.params.connectionId, { beforeId: before, limit }));
  }
);

// REST fallback for sending (the client normally uses the `message:send` socket event).
router.post(
  '/:connectionId/messages',
  validate({ params, body: z.object({ body: z.string() }) }),
  async (req, res) => {
    res.status(201).json({ message: await Messages.send(req.userId, req.params.connectionId, req.body.body) });
  }
);

router.post('/:connectionId/read', validate({ params }), async (req, res) => {
  res.json(await Messages.markRead(req.userId, req.params.connectionId));
});

export default router;
