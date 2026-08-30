import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { sendError } from '../utils/response';

// Extend Express Request type to include authenticated userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    sendError(res, 'Authentication token is missing', 401);
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    sendError(res, 'Invalid Authorization header format. Expected Bearer <token>', 401);
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyJwt(token);
    if (!payload || !payload.userId) {
      sendError(res, 'Invalid token payload', 401);
      return;
    }

    req.userId = payload.userId;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      sendError(res, 'Token has expired. Please log in again.', 401);
      return;
    }
    sendError(res, 'Invalid or malformed authentication token', 401);
  }
};
