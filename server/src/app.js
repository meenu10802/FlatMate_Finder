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

export function createApp() {
  const app = express();
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
  app.use(errorHandler);
  return app;
}
