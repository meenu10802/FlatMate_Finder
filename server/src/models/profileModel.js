import { query } from '../config/db.js';

const SELECT = `
  SELECT p.*, u.name, c.name AS city_name, a.name AS area_name,
         COALESCE(a.lat, c.lat) AS loc_lat, COALESCE(a.lng, c.lng) AS loc_lng
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN cities c ON c.id = p.city_id
    LEFT JOIN areas a ON a.id = p.area_id`;

export function toProfile(r) {
  if (!r) return null;
  return {
    userId: r.user_id,
    name: r.name,
    bio: r.bio,
    age: r.age,
    gender: r.gender,
    occupation: r.occupation,
    avatarUrl: r.avatar_url,
    hasRoom: Boolean(r.has_room),
    roomPhotoUrl: r.room_photo_url,
    city: r.city_id ? { id: r.city_id, name: r.city_name } : null,
    area: r.area_id ? { id: r.area_id, name: r.area_name } : null,
    searchRadiusKm: r.search_radius_km,
    smoking: r.smoking,
    pets: r.pets,
    parties: r.parties,
    cleanliness: r.cleanliness,
    budgetMin: r.budget_min,
    budgetMax: r.budget_max,
    moveInDate: r.move_in_date,
    isActive: Boolean(r.is_active),
    updatedAt: r.updated_at,
  };
}

/** Internal-only: profile + `coords` (area centre, else city centre) for match scoring. Never send `coords` to clients. */
export function toProfileWithCoords(r) {
  const p = toProfile(r);
  if (!p) return null;
  return { ...p, coords: r.loc_lat == null ? null : { lat: Number(r.loc_lat), lng: Number(r.loc_lng) } };
}

export async function findByUserId(userId, { activeOnly = false, withCoords = false } = {}) {
  const rows = await query(`${SELECT} WHERE p.user_id = ?${activeOnly ? ' AND p.is_active = TRUE' : ''}`, [userId]);
  return withCoords ? toProfileWithCoords(rows[0]) : toProfile(rows[0]);
}

const COLUMNS = {
  bio: 'bio',
  age: 'age',
  gender: 'gender',
  occupation: 'occupation',
  avatarUrl: 'avatar_url',
  hasRoom: 'has_room',
  roomPhotoUrl: 'room_photo_url',
  cityId: 'city_id',
  areaId: 'area_id',
  searchRadiusKm: 'search_radius_km',
  smoking: 'smoking',
  pets: 'pets',
  parties: 'parties',
  cleanliness: 'cleanliness',
  budgetMin: 'budget_min',
  budgetMax: 'budget_max',
  moveInDate: 'move_in_date',
};

/** Insert or fully replace the user's profile. `data` must be validated by profileSchema. */
export async function upsert(userId, data) {
  const keys = Object.keys(COLUMNS);
  const cols = keys.map((k) => COLUMNS[k]);
  const sql = `
    INSERT INTO profiles (user_id, ${cols.join(', ')})
    VALUES (?, ${cols.map(() => '?').join(', ')}) AS new
    ON DUPLICATE KEY UPDATE ${cols.map((c) => `${c} = new.${c}`).join(', ')}`;
  await query(sql, [userId, ...keys.map((k) => data[k])]);
  return findByUserId(userId);
}
