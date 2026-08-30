import jwt from 'jsonwebtoken';
import { signJwt, verifyJwt } from '../../src/utils/jwt';
import { env } from '../../src/config/env';

describe('JWT Utility', () => {
  const userId = '11111111-2222-3333-4444-555555555555';

  it('should sign a token containing only userId', () => {
    const token = signJwt(userId);
    expect(typeof token).toBe('string');

    const decoded = jwt.decode(token) as any;
    expect(decoded.userId).toBe(userId);
    expect(decoded.password).toBeUndefined();
    expect(decoded.password_hash).toBeUndefined();
  });

  it('should verify a valid token and return decoded payload', () => {
    const token = signJwt(userId);
    const payload = verifyJwt(token);
    expect(payload.userId).toBe(userId);
  });

  it('should throw on an invalid token', () => {
    expect(() => verifyJwt('invalid.token.signature')).toThrow();
  });

  it('should throw on an expired token', () => {
    const expiredToken = jwt.sign({ userId }, env.JWT.secret, { expiresIn: '0s' });
    expect(() => verifyJwt(expiredToken)).toThrow();
  });
});
