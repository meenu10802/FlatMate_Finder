import { query } from '../config/db.js';

// API JSON is camelCase; DB columns are snake_case. Models do the mapping.
const toUser = (row) =>
  row && {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    hasProfile: Boolean(row.has_profile),
  };

/** Includes password_hash — only for auth checks, never send to clients. */
export async function findByEmailWithHash(email) {
  const rows = await query('SELECT id, password_hash FROM users WHERE email = ?', [email]);
  return rows[0] ?? null;
}

export async function findById(id) {
  const rows = await query(
    `SELECT u.id, u.email, u.name, u.created_at, (p.user_id IS NOT NULL) AS has_profile
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ?`,
    [id]
  );
  return toUser(rows[0]) ?? null;
}

export async function create({ email, name, passwordHash }) {
  const result = await query('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)', [
    email,
    name,
    passwordHash,
  ]);
  return findById(result.insertId);
}
