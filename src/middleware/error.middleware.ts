import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Server-side logging (without leaking credentials)
  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl} - ${err.message || err}`);
    if (err.stack && env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
  }

  // Handle known AppError subclasses (e.g. ConflictError, UnauthorizedError, TooManyRequestsError, NotFoundError, BadRequestError)
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors, err.data);
    return;
  }

  // Handle MySQL Duplicate Entry errors (e.g., race conditions violating UNIQUE constraints)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    const errorMsg = String(err.message || '').toLowerCase();
    if (errorMsg.includes('uq_users_email') || errorMsg.includes('email')) {
      sendError(res, 'Email is already registered', 409);
      return;
    }
    if (errorMsg.includes('uq_users_username') || errorMsg.includes('username')) {
      sendError(res, 'Username is already taken', 409);
      return;
    }
    if (errorMsg.includes('uq_users_mobile') || errorMsg.includes('mobile')) {
      sendError(res, 'Mobile number is already registered', 409);
      return;
    }
    sendError(res, 'A record with duplicate unique field already exists', 409);
    return;
  }

  // Handle database connection or timeout errors safely
  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'PROTOCOL_CONNECTION_LOST' ||
    err.code === 'ETIMEDOUT'
  ) {
    sendError(res, 'Database connection is temporarily unavailable. Please try again later.', 503);
    return;
  }

  // Fallback for uncaught 500 errors - never leak stack traces or credentials
  sendError(res, 'An unexpected internal server error occurred', 500);
};
