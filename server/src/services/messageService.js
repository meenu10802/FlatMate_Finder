import * as Messages from '../models/messageModel.js';
import { HttpError } from '../middleware/errorHandler.js';
import { emitToUser, isOnline } from '../sockets/index.js';

export const MAX_MESSAGE_LENGTH = 2000;

/** The thread, if `userId` belongs to it AND the connection is accepted. Used by every read/write. */
export async function assertThread(userId, connectionId) {
  const thread = await Messages.findThreadForUser(connectionId, userId);
  if (!thread) throw new HttpError(404, 'NOT_FOUND', 'Conversation not found');
  if (thread.status !== 'accepted') throw new HttpError(403, 'NOT_CONNECTED', 'You can message someone once they accept your connection');
  return thread;
}

/** Store a message and push it to both people's sockets (all their tabs). */
export async function send(userId, connectionId, rawBody) {
  const body = String(rawBody ?? '').trim();
  if (!body) throw new HttpError(400, 'VALIDATION_ERROR', 'Message can’t be empty');
  if (body.length > MAX_MESSAGE_LENGTH) throw new HttpError(400, 'VALIDATION_ERROR', `Messages can be at most ${MAX_MESSAGE_LENGTH} characters`);

  const thread = await assertThread(userId, connectionId);
  const message = await Messages.create(connectionId, userId, body);
  emitToUser(thread.otherId, 'message:new', message);
  emitToUser(userId, 'message:new', message);
  return message;
}

export async function history(userId, connectionId, { beforeId, limit }) {
  await assertThread(userId, connectionId);
  return Messages.listPage(connectionId, { beforeId, limit });
}

/** Mark the other person's messages as read and tell both sides (sender sees "Seen"; my other tabs clear the badge). */
export async function markRead(userId, connectionId) {
  const thread = await assertThread(userId, connectionId);
  const readAt = await Messages.markRead(connectionId, userId);
  if (readAt) {
    emitToUser(thread.otherId, 'message:read', { connectionId, readerId: userId, readAt });
    emitToUser(userId, 'message:read', { connectionId, readerId: userId, readAt });
  }
  return { readAt };
}

export async function threads(userId) {
  const list = await Messages.listThreads(userId);
  return list.map((t) => ({ ...t, user: { ...t.user, online: isOnline(t.user.id) } }));
}
