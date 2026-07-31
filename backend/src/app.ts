import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { httpLogger } from './config/logger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { createApiRouter } from './routes/index';

export function createApp(): Express {
  const app = express();

  // Security & Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(httpLogger);

  // Rate Limiting on API endpoints
  app.use('/api', apiRateLimiter);

  // Mount API Routers
  app.use('/api', createApiRouter());

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
