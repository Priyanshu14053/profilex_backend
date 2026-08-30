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
 * Strict rate limiter for sensitive authentication endpoints (login, register)
 * 10 requests per 15 minutes window
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req: Request, res: Response) => {
    sendError(res, 'Too many authentication attempts, please try again after 15 minutes', 429);
  },
});
