import { query, toIsoUtc } from '../config/db.js';

const toConnection = (r, viewerId) =>
  r && {
    id: r.id,
    status: r.status,
    direction: r.requester_id === viewerId ? 'outgoing' : 'incoming',
    requesterId: r.requester_id,
    addresseeId: r.addressee_id,
    otherUserId: r.requester_id === viewerId ? r.addressee_id : r.requester_id,
    createdAt: toIsoUtc(r.created_at),
    updatedAt: toIsoUtc(r.updated_at),
  };

export async function findById(id, viewerId) {
  const rows = await query('SELECT * FROM connections WHERE id = ?', [id]);
  return toConnection(rows[0], viewerId) ?? null;
}

/** The connection between two users in either direction, if any. */
export async function findBetween(a, b) {
  const rows = await query(
    'SELECT * FROM connections WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
    [a, b, b, a]
  );
  return toConnection(rows[0], a) ?? null;
}

export async function create(requesterId, addresseeId) {
  const r = await query('INSERT INTO connections (requester_id, addressee_id) VALUES (?, ?)', [requesterId, addresseeId]);
  return findById(r.insertId, requesterId);
}

export async function setStatus(id, status) {
  await query('UPDATE connections SET status = ? WHERE id = ?', [status, id]);
}

/** Re-open a declined connection as a fresh request from `requesterId`. */
export async function reopen(id, requesterId, addresseeId) {
  await query("UPDATE connections SET requester_id = ?, addressee_id = ?, status = 'pending' WHERE id = ?", [requesterId, addresseeId, id]);
}

/** All of a user's connections with a summary of the other person. */
export async function listForUser(userId) {
  const rows = await query(
    `SELECT c.*, o.id AS other_id, o.name AS other_name, p.avatar_url, p.occupation, p.age,
            ar.name AS area_name, ci.name AS city_name
       FROM connections c
       JOIN users o ON o.id = IF(c.requester_id = ?, c.addressee_id, c.requester_id)
       LEFT JOIN profiles p ON p.user_id = o.id
       LEFT JOIN areas ar ON ar.id = p.area_id
       LEFT JOIN cities ci ON ci.id = p.city_id
      WHERE ? IN (c.requester_id, c.addressee_id) AND c.status <> 'declined'
      ORDER BY c.updated_at DESC`,
    [userId, userId]
  );
  return rows.map((r) => ({
    ...toConnection(r, userId),
    user: {
      id: r.other_id,
      name: r.other_name,
      avatarUrl: r.avatar_url,
      occupation: r.occupation,
      age: r.age,
      location: [r.area_name, r.city_name].filter(Boolean).join(', '),
    },
  }));
}

export async function acceptedPeerIds(userId) {
  const rows = await query(
    `SELECT IF(requester_id = ?, addressee_id, requester_id) AS peer
       FROM connections WHERE status = 'accepted' AND ? IN (requester_id, addressee_id)`,
    [userId, userId]
  );
  return rows.map((r) => r.peer);
}
