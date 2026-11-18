import http from 'node:http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: env.clientOrigin, credentials: true },
});

server.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
