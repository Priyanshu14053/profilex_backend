import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { generalLimiter } from './middleware/rate-limit.middleware';
import { errorHandler } from './middleware/error.middleware';
import { sendSuccess, sendError } from './utils/response';
import apiV1Routes from './routes';
import { pool } from './config/database';

export const createApp = (): Application => {
  const app: Application = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  const corsOrigin = env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Body parser
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Apply general rate limiting to all requests
  app.use(generalLimiter);

  // Health Check Endpoint (Required by Specification 20)
  app.get('/health', (req: Request, res: Response) => {
    sendSuccess(res, 'ProfileX API is running');
  });

  // Detailed Database Health Check (optional internal connectivity check)
  app.get('/health/db', async (req: Request, res: Response) => {
    try {
      const connection = await pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      sendSuccess(res, 'Database connection is healthy', {
        database: env.DB.database,
        host: env.DB.host,
        status: 'connected',
      });
    } catch (error: any) {
      sendError(res, 'Database connection failed', 503, [
        { code: error.code || 'DB_ERROR' },
      ]);
    }
  });

  // Mount API v1 routes
  app.use('/api/v1', apiV1Routes);

  // Handle 404 for unknown endpoints
  app.use('*', (req: Request, res: Response) => {
    sendError(res, `Endpoint ${req.method} ${req.originalUrl} not found`, 404);
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
