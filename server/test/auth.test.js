import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_HOST ??= 'localhost';
process.env.DB_USER ??= 'test';
process.env.DB_NAME ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

const { createApp } = await import('../src/app.js');
const { signToken, verifyToken } = await import('../src/services/authService.js');

let server, base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('token round-trips and rejects garbage', () => {
  assert.equal(verifyToken(signToken(42)), 42);
  assert.equal(verifyToken('not-a-token'), null);
  assert.equal(verifyToken(undefined), null);
});

test('GET /auth/me without cookie → 401', async () => {
  const res = await fetch(base + '/auth/me');
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, 'UNAUTHENTICATED');
});

test('register validates fields', async () => {
  const res = await post('/auth/register', { name: 'A', email: 'bad', password: 'short' });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.details.fieldErrors.name);
  assert.ok(error.details.fieldErrors.email);
  assert.ok(error.details.fieldErrors.password);
});

test('login requires email and password', async () => {
  const res = await post('/auth/login', {});
  assert.equal(res.status, 400);
});

test('logout clears the cookie', async () => {
  const res = await post('/auth/logout', {});
  assert.equal(res.status, 204);
  assert.match(res.headers.get('set-cookie'), /token=;.*Expires=Thu, 01 Jan 1970/);
});
