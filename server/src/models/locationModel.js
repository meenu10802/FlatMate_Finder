import { query } from '../config/db.js';

export async function listCities() {
  const rows = await query(
    `SELECT c.id, c.name, c.state, c.country, c.lat, c.lng, COUNT(a.id) AS area_count
       FROM cities c LEFT JOIN areas a ON a.city_id = c.id
      GROUP BY c.id ORDER BY c.name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    state: r.state,
    country: r.country,
    lat: Number(r.lat),
    lng: Number(r.lng),
    areaCount: Number(r.area_count),
  }));
}

export async function findCity(id) {
  const rows = await query('SELECT id, name FROM cities WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function listAreas(cityId) {
  const rows = await query('SELECT id, city_id, name, lat, lng FROM areas WHERE city_id = ? ORDER BY name', [cityId]);
  return rows.map((r) => ({ id: r.id, cityId: r.city_id, name: r.name, lat: Number(r.lat), lng: Number(r.lng) }));
}

export async function findCityWithCoords(id) {
  const rows = await query('SELECT id, name, lat, lng FROM cities WHERE id = ?', [id]);
  const r = rows[0];
  return r ? { id: r.id, name: r.name, lat: Number(r.lat), lng: Number(r.lng) } : null;
}

export async function findAreaWithCoords(id) {
  const rows = await query(
    'SELECT a.id, a.name, a.city_id, c.name AS city_name, a.lat, a.lng FROM areas a JOIN cities c ON c.id = a.city_id WHERE a.id = ?',
    [id]
  );
  const r = rows[0];
  return r ? { id: r.id, name: r.name, cityId: r.city_id, cityName: r.city_name, lat: Number(r.lat), lng: Number(r.lng) } : null;
}

export async function findArea(id) {
  const rows = await query('SELECT id, city_id, name FROM areas WHERE id = ?', [id]);
  return rows[0] ? { id: rows[0].id, cityId: rows[0].city_id, name: rows[0].name } : null;
}
