import { pool, query, toIsoUtc } from '../config/db.js';

export const toMessage = (r) =>
  r && {
    id: Number(r.id),
    connectionId: r.connection_id,
    senderId: r.sender_id,
    body: r.body,
    createdAt: toIsoUtc(r.created_at),
    readAt: toIsoUtc(r.read_at),
  };

/** The connection if `userId` is part of it, with the other person's id. */
export async function findThreadForUser(connectionId, userId) {
  const rows = await query('SELECT id, status, requester_id, addressee_id FROM connections WHERE id = ?', [connectionId]);
  const c = rows[0];
  if (!c || (c.requester_id !== userId && c.addressee_id !== userId)) return null;
  return { id: c.id, status: c.status, otherId: c.requester_id === userId ? c.addressee_id : c.requester_id };
}

export async function create(connectionId, senderId, body) {
  const r = await query('INSERT INTO messages (connection_id, sender_id, body) VALUES (?, ?, ?)', [connectionId, senderId, body]);
  const rows = await query('SELECT * FROM messages WHERE id = ?', [r.insertId]);
  return toMessage(rows[0]);
}

/** Newest `limit` messages older than `beforeId` (or the latest), returned oldest → newest. */
export async function listPage(connectionId, { beforeId, limit }) {
  // pool.query: mysql2 prepared statements reject numeric LIMIT params on MySQL 8.0.22+.
  const [rows] = await pool.query(
    `SELECT * FROM messages WHERE connection_id = ? ${beforeId ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT ?`,
    beforeId ? [connectionId, beforeId, limit + 1] : [connectionId, limit + 1]
  );
  const hasMore = rows.length > limit;
  return { messages: rows.slice(0, limit).reverse().map(toMessage), hasMore };
}

/** Mark everything the other person sent as read. Returns the read timestamp, or null if nothing changed. */
export async function markRead(connectionId, readerId) {
  const r = await query(
    'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE connection_id = ? AND sender_id <> ? AND read_at IS NULL',
    [connectionId, readerId]
  );
  if (!r.affectedRows) return null;
  const rows = await query('SELECT MAX(read_at) AS t FROM messages WHERE connection_id = ? AND sender_id <> ?', [connectionId, readerId]);
  return toIsoUtc(rows[0].t);
}

/**
 * Inbox list: every accepted connection with the other person, last message and my unread count.
 * Last-message ids and unread counts come from grouped derived tables rather than a subquery in an
 * ON clause — TiDB (cloud DB) rejects `ON x = (SELECT …)` ("ON condition doesn't support subqueries yet").
 */
export async function listThreads(userId) {
  const rows = await query(
    `SELECT c.id AS connection_id, c.updated_at AS connected_at,
            o.id AS other_id, o.name AS other_name, p.avatar_url, p.occupation,
            ar.name AS area_name, ci.name AS city_name,
            lm.id AS last_id, lm.sender_id AS last_sender_id, lm.body AS last_body,
            lm.created_at AS last_created_at, lm.read_at AS last_read_at,
            COALESCE(un.unread, 0) AS unread
       FROM connections c
       JOIN users o ON o.id = IF(c.requester_id = ?, c.addressee_id, c.requester_id)
       LEFT JOIN profiles p ON p.user_id = o.id
       LEFT JOIN areas ar ON ar.id = p.area_id
       LEFT JOIN cities ci ON ci.id = p.city_id
       LEFT JOIN (SELECT connection_id, MAX(id) AS last_id FROM messages GROUP BY connection_id) lx
              ON lx.connection_id = c.id
       LEFT JOIN messages lm ON lm.id = lx.last_id
       LEFT JOIN (SELECT connection_id, COUNT(*) AS unread FROM messages
                   WHERE sender_id <> ? AND read_at IS NULL GROUP BY connection_id) un
              ON un.connection_id = c.id
      WHERE c.status = 'accepted' AND ? IN (c.requester_id, c.addressee_id)
      ORDER BY COALESCE(lm.created_at, c.updated_at) DESC`,
    [userId, userId, userId]
  );
  return rows.map((r) => ({
    connectionId: r.connection_id,
    connectedAt: toIsoUtc(r.connected_at),
    user: {
      id: r.other_id,
      name: r.other_name,
      avatarUrl: r.avatar_url,
      occupation: r.occupation,
      location: [r.area_name, r.city_name].filter(Boolean).join(', '),
    },
    lastMessage: r.last_id
      ? toMessage({ id: r.last_id, connection_id: r.connection_id, sender_id: r.last_sender_id, body: r.last_body, created_at: r.last_created_at, read_at: r.last_read_at })
      : null,
    unread: Number(r.unread),
  }));
}
