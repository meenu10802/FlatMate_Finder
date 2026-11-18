import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_HOST ??= 'localhost';
process.env.DB_USER ??= 'test';
process.env.DB_NAME ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

const { createApp } = await import('../src/app.js');
const { signToken } = await import('../src/services/authService.js');
const { pool } = await import('../src/config/db.js');

let server, base;
const cookie = `token=${signToken(1)}`;
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await pool.end(); });

test('profile routes require auth', async () => {
  for (const [method, path] of [['GET', '/profiles/me'], ['PUT', '/profiles/me'], ['GET', '/profiles/2']]) {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('PUT /profiles/me rejects invalid preferences', async () => {
  const res = await fetch(base + '/profiles/me', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ age: 16, cityId: 1, smoking: 'sometimes', pets: 'no', parties: 'no', cleanliness: 9, budgetMin: 1, budgetMax: 2, moveInDate: 'soon' }),
  });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  for (const f of ['age', 'smoking', 'cleanliness', 'moveInDate']) assert.ok(error.details.fieldErrors[f], f);
});

test('GET /profiles/:userId rejects non-numeric ids', async () => {
  const res = await fetch(base + '/profiles/abc', { headers: { cookie } });
  assert.equal(res.status, 400);
});
