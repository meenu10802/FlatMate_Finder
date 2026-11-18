import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.DB_HOST ??= 'localhost';
process.env.DB_USER ??= 'test';
process.env.DB_NAME ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

const { io: connect } = await import('socket.io-client');
const { createApp } = await import('../src/app.js');
const { initSockets } = await import('../src/sockets/index.js');
const { pool, query } = await import('../src/config/db.js');
const { signToken } = await import('../src/services/authService.js');

let server, base, origin, dbUp = true;
const created = [];
const sockets = [];

async function makeUser(name) {
  const email = `msgtest+${name.toLowerCase()}+${Date.now()}@example.com`;
  const r = await query("INSERT INTO users (email, name, password_hash) VALUES (?, ?, 'x')", [email, name]);
  const id = r.insertId;
  created.push(id);
  const [area] = await query("SELECT id, city_id FROM areas WHERE name = 'Adyar'");
  await query(
    `INSERT INTO profiles (user_id, age, city_id, area_id, smoking, pets, parties, cleanliness, budget_min, budget_max, move_in_date)
     VALUES (?, 25, ?, ?, 'no', 'no', 'no', 3, 10000, 20000, '2026-12-01')`,
    [id, area.city_id, area.id]
  );
  return { id, cookie: `token=${signToken(id)}` };
}

const api = (user, method, path, body) =>
  fetch(`${base}${path}`, {
    method,
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: r.status === 204 ? null : await r.json() }));

function openSocket(user) {
  const s = connect(origin, { extraHeaders: { cookie: user.cookie }, transports: ['websocket'], forceNew: true });
  sockets.push(s);
  return s;
}
const once = (s, event, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    s.once(event, (d) => { clearTimeout(t); resolve(d); });
  });
const emitAck = (s, event, payload) => new Promise((resolve) => s.emit(event, payload, resolve));

before(async () => {
  try { await pool.query('SELECT 1 FROM messages LIMIT 1'); } catch { dbUp = false; return; }
  server = http.createServer(createApp());
  await initSockets(server);
  await new Promise((r) => server.listen(0, r));
  origin = `http://localhost:${server.address().port}`;
  base = `${origin}/api`;
});

after(async () => {
  sockets.forEach((s) => s.close());
  await new Promise((r) => setTimeout(r, 300)); // let server-side disconnect handlers finish before closing the pool
  if (created.length) await query(`DELETE FROM users WHERE id IN (${created.map(() => '?').join(',')})`, created);
  server?.close();
  await pool.end();
});

test('connections → real-time messaging, presence, unread and read receipts', async (t) => {
  if (!dbUp) return t.skip('database not available');
  const asha = await makeUser('Asha');
  const ben = await makeUser('Ben');
  const eve = await makeUser('Eve');

  // 1. Request → cannot message while pending.
  const req = await api(asha, 'POST', '/connections', { addresseeId: ben.id });
  assert.equal(req.status, 201);
  const cid = req.body.connection.id;
  assert.equal(req.body.connection.status, 'pending');
  assert.equal((await api(asha, 'POST', `/conversations/${cid}/messages`, { body: 'hi' })).body.error.code, 'NOT_CONNECTED');
  assert.equal((await api(asha, 'PATCH', `/connections/${cid}`, { status: 'accepted' })).status, 403, 'requester cannot accept');

  // 2. Sockets connect; Ben accepts → Asha is told and sees Ben online.
  const sa = openSocket(asha);
  await once(sa, 'presence:list');
  const sb = openSocket(ben);
  await once(sb, 'presence:list');
  const aUpdate = once(sa, 'connection:update');
  const aPresence = once(sa, 'presence:update');
  assert.equal((await api(ben, 'PATCH', `/connections/${cid}`, { status: 'accepted' })).body.connection.status, 'accepted');
  assert.deepEqual(await aUpdate, { id: cid, status: 'accepted' });
  assert.deepEqual(await aPresence, { userId: ben.id, online: true });

  // 3. Asha sends over the socket → Ben receives instantly; Asha gets an ack.
  const bGets = once(sb, 'message:new');
  const ack = await emitAck(sa, 'message:send', { connectionId: cid, body: '  Hey Ben! Still looking for a flat in Adyar?  ' });
  assert.equal(ack.ok, true);
  assert.equal(ack.data.body, 'Hey Ben! Still looking for a flat in Adyar?', 'trimmed');
  assert.match(ack.data.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal((await bGets).id, ack.data.id);

  // 4. Unread count for Ben, zero for Asha.
  const bList = (await api(ben, 'GET', '/conversations')).body.conversations;
  assert.equal(bList.length, 1);
  assert.equal(bList[0].unread, 1);
  assert.equal(bList[0].user.online, true);
  assert.equal(bList[0].lastMessage.body, 'Hey Ben! Still looking for a flat in Adyar?');
  assert.equal((await api(asha, 'GET', '/conversations')).body.conversations[0].unread, 0);

  // 5. Typing indicator reaches the other side.
  const typing = once(sa, 'typing');
  sb.emit('typing', { connectionId: cid, isTyping: true });
  assert.deepEqual(await typing, { connectionId: cid, userId: ben.id, isTyping: true });

  // 6. Ben reads → Asha gets a read receipt; Ben's unread drops to 0.
  const receipt = once(sa, 'message:read');
  assert.equal((await emitAck(sb, 'message:read', { connectionId: cid })).ok, true);
  assert.equal((await receipt).readerId, ben.id);
  assert.equal((await api(ben, 'GET', '/conversations')).body.conversations[0].unread, 0);

  // 7. History pages oldest → newest.
  for (const n of [1, 2, 3]) await emitAck(sb, 'message:send', { connectionId: cid, body: `reply ${n}` });
  const page = (await api(asha, 'GET', `/conversations/${cid}/messages?limit=2`)).body;
  assert.deepEqual(page.messages.map((m) => m.body), ['reply 2', 'reply 3']);
  assert.equal(page.hasMore, true);
  const older = (await api(asha, 'GET', `/conversations/${cid}/messages?limit=10&before=${page.messages[0].id}`)).body;
  assert.deepEqual(older.messages.map((m) => m.body), ['Hey Ben! Still looking for a flat in Adyar?', 'reply 1']);

  // 8. Strangers and bad payloads are rejected.
  assert.equal((await api(eve, 'GET', `/conversations/${cid}/messages`)).status, 404);
  const se = openSocket(eve);
  await once(se, 'presence:list');
  assert.equal((await emitAck(se, 'message:send', { connectionId: cid, body: 'sneaky' })).error.code, 'NOT_FOUND');
  assert.equal((await emitAck(sa, 'message:send', { connectionId: cid, body: '   ' })).error.code, 'VALIDATION_ERROR');
  assert.equal((await emitAck(sa, 'message:send', { connectionId: cid, body: 'x'.repeat(2001) })).error.code, 'VALIDATION_ERROR');

  // 9. Ben goes offline → Asha is told.
  const offline = once(sa, 'presence:update');
  sb.close();
  assert.deepEqual(await offline, { userId: ben.id, online: false });
});

test('sockets reject connections without a valid session', async (t) => {
  if (!dbUp) return t.skip('database not available');
  const s = connect(origin, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.push(s);
  const err = await once(s, 'connect_error');
  assert.equal(err.message, 'UNAUTHENTICATED');
});
