import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import locationsRouter from './routes/locations.js';
import profilesRouter from './routes/profiles.js';
import flatmatesRouter from './routes/flatmates.js';
import connectionsRouter from './routes/connections.js';
import conversationsRouter from './routes/conversations.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

/**
 * Serve the built React app from the same origin as the API (production).
 * Same origin keeps the httpOnly session cookie first-party and lets socket.io connect to the page's host.
 */
function serveClient(app) {
  const indexHtml = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.warn(`[client] ${indexHtml} not found — run \`npm run build\` at the repo root. Serving the API only.`);
    return;
  }
  // Hashed build assets never change → cache for a year. index.html must always be revalidated.
  app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
  // SPA fallback: any other GET that isn't the API or socket.io gets index.html; React Router takes it from there.
  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) || req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}

export function createApp({ serveClientBuild = env.isProd } = {}) {
  const app = express();
  // Behind Render's proxy: trust X-Forwarded-* so rate limiting sees real client IPs and req.secure is right.
  if (env.isProd) app.set('trust proxy', 1);

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/locations', locationsRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/flatmates', flatmatesRouter);
  app.use('/api/connections', connectionsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api', notFound);

  if (serveClientBuild) serveClient(app);

  app.use(errorHandler);
  return app;
}
