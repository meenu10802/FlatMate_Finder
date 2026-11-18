import * as Connections from '../models/connectionModel.js';
import * as Profiles from '../models/profileModel.js';
import { HttpError } from '../middleware/errorHandler.js';
import { emitToUser, isOnline } from '../sockets/index.js';

function notify(conn) {
  for (const uid of [conn.requesterId, conn.addresseeId]) {
    emitToUser(uid, 'connection:update', { id: conn.id, status: conn.status });
  }
  if (conn.status === 'accepted') {
    // Newly connected people can now see each other's presence.
    emitToUser(conn.requesterId, 'presence:update', { userId: conn.addresseeId, online: isOnline(conn.addresseeId) });
    emitToUser(conn.addresseeId, 'presence:update', { userId: conn.requesterId, online: isOnline(conn.requesterId) });
  }
}

/**
 * Send a request. Handles the edge cases:
 *  - they already asked me → accept theirs
 *  - I declined them before → re-open as my request
 *  - they declined me → 409
 */
export async function request(meId, otherId) {
  if (meId === otherId) throw new HttpError(400, 'VALIDATION_ERROR', 'You can’t connect with yourself');
  if (!(await Profiles.findByUserId(otherId, { activeOnly: true }))) throw new HttpError(404, 'NOT_FOUND', 'Profile not found');

  const existing = await Connections.findBetween(meId, otherId);
  if (!existing) {
    try {
      const conn = await Connections.create(meId, otherId);
      notify(conn);
      return conn;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err; // lost a race with an identical request
      return Connections.findBetween(meId, otherId);
    }
  }
  if (existing.status === 'accepted') return existing;
  if (existing.status === 'pending') {
    if (existing.direction === 'outgoing') return existing;
    return respond(meId, existing.id, 'accepted');
  }
  // declined
  if (existing.direction === 'outgoing') {
    throw new HttpError(409, 'REQUEST_DECLINED', 'This person isn’t accepting a connection from you right now');
  }
  await Connections.reopen(existing.id, meId, otherId);
  const conn = await Connections.findById(existing.id, meId);
  notify(conn);
  return conn;
}

export async function respond(meId, connectionId, status) {
  const conn = await Connections.findById(connectionId, meId);
  if (!conn || (conn.requesterId !== meId && conn.addresseeId !== meId)) throw new HttpError(404, 'NOT_FOUND', 'Connection not found');
  if (conn.addresseeId !== meId) throw new HttpError(403, 'FORBIDDEN', 'Only the person who received the request can respond');
  if (conn.status !== 'pending') throw new HttpError(409, 'ALREADY_RESPONDED', `This request was already ${conn.status}`);
  await Connections.setStatus(connectionId, status);
  const updated = await Connections.findById(connectionId, meId);
  notify(updated);
  return updated;
}

export async function list(meId) {
  const all = await Connections.listForUser(meId);
  return {
    incoming: all.filter((c) => c.status === 'pending' && c.direction === 'incoming'),
    outgoing: all.filter((c) => c.status === 'pending' && c.direction === 'outgoing'),
    accepted: all.filter((c) => c.status === 'accepted').map((c) => ({ ...c, user: { ...c.user, online: isOnline(c.user.id) } })),
  };
}

export const withUser = (meId, otherId) => Connections.findBetween(meId, otherId);
