import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';

const app = createApp();
const server = http.createServer(app);
await initSockets(server);

server.listen(env.port, () => {
  console.log(`API + Socket.IO listening on http://localhost:${env.port}`);
});
