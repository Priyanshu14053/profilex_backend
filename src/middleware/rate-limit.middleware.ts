import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';

/**
 * Standard rate limiter for general API endpoints
 * 100 requests per 15 minutes window
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req: Request, res: Response) => {
    sendError(res, 'Too many requests from this IP, please try again after 15 minutes', 429);
  },
});

/**
 * Rate limiter for sensitive authentication endpoints (login, register)
 * 100 requests per 15 minutes window (allows frequent testing during development)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '100', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req: Request, res: Response) => {
    sendError(res, 'Too many authentication attempts. Please try again after 15 minutes.', 429);
  },
});
