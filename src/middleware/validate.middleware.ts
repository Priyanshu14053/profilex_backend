import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(
      res,
      'Validation failed',
      400,
      errors.array().map((err) => ({
        field: (err as any).path || (err as any).param,
        message: err.msg,
      }))
    );
    return;
  }
  next();
};
