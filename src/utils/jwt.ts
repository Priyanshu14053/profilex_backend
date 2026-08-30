import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
}

/**
 * Generates a signed JWT containing only the userId
 */
export const signJwt = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT.secret, {
    expiresIn: env.JWT.expiresIn as any,
  });
};

/**
 * Verifies a JWT token and returns its decoded payload
 */
export const verifyJwt = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT.secret) as JwtPayload;
};
