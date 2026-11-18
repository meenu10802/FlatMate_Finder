import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';

const app = createApp();
const server = http.createServer(app);
await initSockets(server);

// 0.0.0.0: hosting platforms (Render) route traffic to the container's external interface.
server.listen(env.port, '0.0.0.0', () => {
  console.log(`API + Socket.IO listening on port ${env.port}${env.isProd ? ' (production, serving client build)' : ''}`);
});
