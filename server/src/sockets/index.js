import { Server } from 'socket.io';
import { z } from 'zod';
import { env } from '../config/env.js';

/**
 * Socket.IO: real-time messages, read receipts, typing and presence.
 * Each user joins room `user:<id>` (one per open tab); services emit to that room.
 * Presence is in-memory, so it's correct for a single server process. Use the socket.io Redis adapter to scale out.
 */

let io = null;
const onlineCounts = new Map(); // userId → number of connected sockets (tabs)

export const isOnline = (userId) => (onlineCounts.get(userId) ?? 0) > 0;

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((p) => p.trim().split('='))
      .filter(([k, v]) => k && v)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

const sendSchema = z.object({ connectionId: z.number().int().positive(), body: z.string() });
const threadSchema = z.object({ connectionId: z.number().int().positive() });
const typingSchema = threadSchema.extend({ isTyping: z.boolean() });

// Simple per-socket flood guard: at most 20 messages per 10 seconds.
function rateLimiter(max = 20, windowMs = 10_000) {
  let stamps = [];
  return () => {
    const now = Date.now();
    stamps = stamps.filter((t) => now - t < windowMs);
    if (stamps.length >= max) return false;
    stamps.push(now);
    return true;
  };
}

export async function initSockets(httpServer) {
  // Imported lazily: these modules import emitToUser/isOnline from this file.
  const { TOKEN_COOKIE, verifyToken } = await import('../services/authService.js');
  const Messages = await import('../services/messageService.js');
  const { acceptedPeerIds } = await import('../models/connectionModel.js');

  io = new Server(httpServer, { cors: { origin: env.clientOrigin, credentials: true } });

  // Authenticate the handshake with the same httpOnly JWT cookie as the REST API.
  io.use((socket, next) => {
    const userId = verifyToken(parseCookies(socket.handshake.headers.cookie)[TOKEN_COOKIE]);
    if (!userId) return next(new Error('UNAUTHENTICATED'));
    socket.data.userId = userId;
    next();
  });

  const broadcastPresence = async (userId, online) => {
    for (const peer of await acceptedPeerIds(userId)) emitToUser(peer, 'presence:update', { userId, online });
  };

  // Wrap handlers: validate payload, call ack({ ok, data | error }).
  const handler = (schema, fn) => async (payload, ack = () => {}) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' } });
    try {
      ack({ ok: true, data: await fn(parsed.data) });
    } catch (err) {
      if (!err.status || err.status >= 500) console.error(err);
      ack({ ok: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.status < 500 ? err.message : 'Something went wrong' } });
    }
  };

  io.on('connection', async (socket) => {
    const { userId } = socket.data;
    socket.join(`user:${userId}`);
    const count = (onlineCounts.get(userId) ?? 0) + 1;
    onlineCounts.set(userId, count);

    try {
      const peers = await acceptedPeerIds(userId);
      socket.emit('presence:list', peers.filter(isOnline));
      if (count === 1) await broadcastPresence(userId, true);
    } catch (err) {
      console.error('presence init failed', err);
    }

    const allowSend = rateLimiter();

    socket.on('message:send', handler(sendSchema, async ({ connectionId, body }) => {
      if (!allowSend()) throw Object.assign(new Error('You’re sending messages too quickly'), { status: 429, code: 'RATE_LIMITED' });
      return Messages.send(userId, connectionId, body);
    }));

    socket.on('message:read', handler(threadSchema, ({ connectionId }) => Messages.markRead(userId, connectionId)));

    socket.on('typing', handler(typingSchema, async ({ connectionId, isTyping }) => {
      const thread = await Messages.assertThread(userId, connectionId);
      emitToUser(thread.otherId, 'typing', { connectionId, userId, isTyping });
    }));

    socket.on('disconnect', async () => {
      const left = (onlineCounts.get(userId) ?? 1) - 1;
      if (left > 0) return onlineCounts.set(userId, left);
      onlineCounts.delete(userId);
      try {
        await broadcastPresence(userId, false);
      } catch (err) {
        console.error('presence broadcast failed', err);
      }
    });
  });

  return io;
}
