import { pool } from '../config/db.js';
import { toProfile } from './profileModel.js';
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

/**
 * Active profiles (excluding the viewer) within `radiusKm` of `origin`, nearest first.
 * Returns { rows: [{ ...profile, distanceKm }], total }.
 */
export async function searchByDistance({ origin, radiusKm, excludeUserId, limit, offset }) {
  const box = boundingBox(origin.lat, origin.lng, radiusKm);

  const sql = `
    SELECT t.*, COUNT(*) OVER () AS total
      FROM (
        SELECT p.*, u.name, c.name AS city_name, a.name AS area_name,
               ${HAVERSINE_KM} AS distance_km
          FROM profiles p
          JOIN users u  ON u.id = p.user_id
          JOIN cities c ON c.id = p.city_id
          LEFT JOIN areas a ON a.id = p.area_id
         WHERE p.is_active = TRUE
           AND p.user_id <> ?
           AND ${LAT} BETWEEN ? AND ?
           AND ${LNG} BETWEEN ? AND ?
      ) t
     WHERE t.distance_km <= ?
     ORDER BY t.distance_km ASC, t.updated_at DESC
     LIMIT ? OFFSET ?`;

  // pool.query (not execute): mysql2 prepared statements reject numeric LIMIT/OFFSET params on MySQL 8.0.22+.
  const [rows] = await pool.query(sql, [
    origin.lat, origin.lat, origin.lng,
    excludeUserId,
    box.minLat, box.maxLat, box.minLng, box.maxLng,
    radiusKm,
    limit, offset,
  ]);

  return {
    total: rows.length ? Number(rows[0].total) : 0,
    rows: rows.map((r) => ({ ...toProfile(r), distanceKm: Math.round(Number(r.distance_km) * 10) / 10 })),
  };
}
