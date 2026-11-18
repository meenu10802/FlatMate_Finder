import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_HOST ??= 'localhost';
process.env.DB_USER ??= 'test';
process.env.DB_NAME ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

const { createApp } = await import('../src/app.js');
const { pool, query } = await import('../src/config/db.js');
const { signToken } = await import('../src/services/authService.js');
const { haversineKm, boundingBox } = await import('../src/services/locationService.js');

let server, base, dbUp = true;
before(async () => {
  try { await pool.query('SELECT 1 FROM areas LIMIT 1'); } catch { dbUp = false; }
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await pool.end(); });

/* ── Pure Haversine ─────────────────────────────────────────── */

test('haversineKm: zero, symmetry and known distances', () => {
  assert.equal(haversineKm(13.0063, 80.2574, 13.0063, 80.2574), 0);
  const ab = haversineKm(19.0596, 72.8295, 19.1364, 72.8296);
  assert.ok(Math.abs(ab - haversineKm(19.1364, 72.8296, 19.0596, 72.8295)) < 1e-9);
  // Bandra West → Andheri West: ~8.5 km due north
  assert.ok(ab > 8.4 && ab < 8.6, `Bandra→Andheri = ${ab}`);
  // Mumbai → Pune city centres: ~120 km straight line
  const mp = haversineKm(19.076, 72.8777, 18.5204, 73.8567);
  assert.ok(mp > 115 && mp < 125, `Mumbai→Pune = ${mp}`);
  // 1° of latitude ≈ 111.2 km
  assert.ok(Math.abs(haversineKm(0, 0, 1, 0) - 111.19) < 0.05);
});

test('boundingBox contains every point within the radius', () => {
  const o = { lat: 13.0063, lng: 80.2574 };
  const box = boundingBox(o.lat, o.lng, 25);
  for (let bearing = 0; bearing < 360; bearing += 15) {
    const rad = (bearing * Math.PI) / 180;
    const lat = o.lat + (24.9 / 111.2) * Math.cos(rad);
    const lng = o.lng + (24.9 / (111.2 * Math.cos((o.lat * Math.PI) / 180))) * Math.sin(rad);
    assert.ok(lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng, `bearing ${bearing}`);
  }
});

/* ── Database ───────────────────────────────────────────────── */

test('MySQL Haversine matches the JS reference for every neighbourhood pair', async (t) => {
  if (!dbUp) return t.skip('database not available');
  const rows = await query(`
    SELECT a1.lat AS lat1, a1.lng AS lng1, a2.lat AS lat2, a2.lng AS lng2,
           6371 * 2 * ASIN(LEAST(1, SQRT(
             POWER(SIN(RADIANS(a2.lat - a1.lat) / 2), 2) +
             COS(RADIANS(a1.lat)) * COS(RADIANS(a2.lat)) * POWER(SIN(RADIANS(a2.lng - a1.lng) / 2), 2)
           ))) AS d
      FROM areas a1 CROSS JOIN areas a2`);
  assert.equal(rows.length, 21 * 21);
  for (const r of rows) {
    const js = haversineKm(+r.lat1, +r.lng1, +r.lat2, +r.lng2);
    assert.ok(Math.abs(js - Number(r.d)) < 0.001, `SQL ${r.d} vs JS ${js}`);
  }
});

async function sampleViewer() {
  const [u] = await query("SELECT id FROM users WHERE email = 'ananya@sample.flatmatefinder.dev'");
  return u ? `token=${signToken(u.id)}` : null;
}

test('GET /flatmates: distances are within radius, sorted, 1 dp, and exact', async (t) => {
  if (!dbUp) return t.skip('database not available');
  const cookie = await sampleViewer();
  if (!cookie) return t.skip('sample users not seeded — run npm run seed');
  const [velachery] = await query("SELECT id, lat, lng FROM areas WHERE name = 'Velachery'");

  const res = await fetch(`${base}/flatmates?areaId=${velachery.id}&radiusKm=25`, { headers: { cookie } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.origin.name, 'Velachery');
  assert.equal(body.radiusKm, 25);
  assert.ok(body.flatmates.length > 0, 'expected Chennai sample flatmates');

  let prev = -1;
  for (const f of body.flatmates) {
    assert.equal(typeof f.distanceKm, 'number');
    assert.ok(f.distanceKm <= 25);
    assert.ok(f.distanceKm >= prev, 'sorted nearest first');
    assert.equal(f.distanceKm, Math.round(f.distanceKm * 10) / 10, '1 decimal place');
    assert.equal(f.city.name, 'Chennai', 'nothing from other cities within 25 km');
    assert.notEqual(f.name, 'Ananya Rao', 'viewer excluded');
    const [loc] = await query('SELECT lat, lng FROM areas WHERE id = ?', [f.area.id]);
    const expected = Math.round(haversineKm(+velachery.lat, +velachery.lng, +loc.lat, +loc.lng) * 10) / 10;
    assert.equal(f.distanceKm, expected);
    prev = f.distanceKm;
  }
});

test('GET /flatmates: a smaller radius returns a subset', async (t) => {
  if (!dbUp) return t.skip('database not available');
  const cookie = await sampleViewer();
  if (!cookie) return t.skip('sample users not seeded');
  const [mylapore] = await query("SELECT id FROM areas WHERE name = 'Mylapore'");
  const get = async (r) => (await (await fetch(`${base}/flatmates?areaId=${mylapore.id}&radiusKm=${r}`, { headers: { cookie } })).json()).flatmates;
  const near = await get(1);
  const far = await get(25);
  assert.ok(near.length <= far.length);
  assert.ok(near.every((f) => f.distanceKm <= 1));
  for (const f of near) assert.ok(far.some((g) => g.userId === f.userId));
});

test('GET /flatmates: validates radius and auth', async (t) => {
  assert.equal((await fetch(`${base}/flatmates`)).status, 401);
  const cookie = `token=${signToken(999999)}`;
  for (const r of [0, 26, 'abc']) {
    const res = await fetch(`${base}/flatmates?cityId=1&radiusKm=${r}`, { headers: { cookie } });
    assert.equal(res.status, 400, `radiusKm=${r}`);
  }
  if (!dbUp) return t.skip('database not available for origin checks');
  const res = await fetch(`${base}/flatmates`, { headers: { cookie } }); // user without a profile, no location given
  assert.equal((await res.json()).error.code, 'LOCATION_REQUIRED');
});
