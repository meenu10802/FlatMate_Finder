import { pool } from '../config/db.js';
import { toProfileWithCoords } from './profileModel.js';
import { EARTH_RADIUS_KM, boundingBox } from '../services/locationService.js';

// A flatmate's position = their neighbourhood centre, or their city centre if they chose "anywhere in city".
const LAT = 'COALESCE(a.lat, c.lat)';
const LNG = 'COALESCE(a.lng, c.lng)';

/**
 * Haversine great-circle distance in km from (?, ?) = (originLat, originLng).
 * Params, in order: originLat, originLat, originLng.
 * LEAST(1, …) guards ASIN against floating-point values a hair above 1.
 */
const HAVERSINE_KM = `
  ${EARTH_RADIUS_KM} * 2 * ASIN(LEAST(1, SQRT(
    POWER(SIN(RADIANS(${LAT} - ?) / 2), 2) +
    COS(RADIANS(?)) * COS(RADIANS(${LAT})) *
    POWER(SIN(RADIANS(${LNG} - ?) / 2), 2)
  )))`;

/** Upper bound on candidates scored per search. Radius is ≤ 25 km, so this is generous; revisit if data grows. */
export const MAX_CANDIDATES = 500;

/**
 * Active profiles (excluding the viewer) within `radiusKm` of `origin` that pass the preference filters,
 * nearest first. Scoring, minScore, sorting and pagination happen in the route (scores are computed in JS).
 *
 * filters: { smoking?: string[], pets?: string[], parties?: string[], budgetMax?: number,
 *            moveInBefore?: 'YYYY-MM-DD', hasRoom?: boolean }
 * Returns profiles with `distanceKm` (1 dp, from the search origin) and internal `coords`.
 */
export async function searchByDistance({ origin, radiusKm, excludeUserId, filters = {} }) {
  const box = boundingBox(origin.lat, origin.lng, radiusKm);
  const where = [];
  const params = [];

  for (const key of ['smoking', 'pets', 'parties']) {
    if (filters[key]?.length) {
      where.push(`p.${key} IN (${filters[key].map(() => '?').join(', ')})`);
      params.push(...filters[key]);
    }
  }
  if (filters.budgetMax != null) {
    where.push('p.budget_min <= ?'); // they could pay within my ceiling
    params.push(filters.budgetMax);
  }
  if (filters.moveInBefore) {
    where.push('p.move_in_date <= ?');
    params.push(filters.moveInBefore);
  }
  if (filters.hasRoom != null) {
    where.push('p.has_room = ?');
    params.push(filters.hasRoom);
  }

  const sql = `
    SELECT t.* FROM (
        SELECT p.*, u.name, c.name AS city_name, a.name AS area_name,
               ${LAT} AS loc_lat, ${LNG} AS loc_lng,
               ${HAVERSINE_KM} AS distance_km
          FROM profiles p
          JOIN users u  ON u.id = p.user_id
          JOIN cities c ON c.id = p.city_id
          LEFT JOIN areas a ON a.id = p.area_id
         WHERE p.is_active = TRUE
           AND p.user_id <> ?
           AND ${LAT} BETWEEN ? AND ?
           AND ${LNG} BETWEEN ? AND ?
           ${where.map((w) => `AND ${w}`).join('\n           ')}
      ) t
     WHERE t.distance_km <= ?
     ORDER BY t.distance_km ASC, t.updated_at DESC
     LIMIT ${MAX_CANDIDATES}`;

  // pool.query (not execute): keeps parity with other dynamic queries; all values are still parameterised.
  const [rows] = await pool.query(sql, [
    origin.lat, origin.lat, origin.lng,
    excludeUserId,
    box.minLat, box.maxLat, box.minLng, box.maxLng,
    ...params,
    radiusKm,
  ]);

  return rows.map((r) => ({ ...toProfileWithCoords(r), distanceKm: Math.round(Number(r.distance_km) * 10) / 10 }));
}
