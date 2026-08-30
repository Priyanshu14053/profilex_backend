import { hashPassword, comparePassword } from '../../src/utils/password';

describe('Password Utility (bcrypt)', () => {
  const plainPassword = 'SecurePassword123';

  it('should hash a password correctly', async () => {
    const hash = await hashPassword(plainPassword);
    expect(hash).toBeDefined();
    expect(hash).not.toEqual(plainPassword);
    expect(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$')).toBe(true);
  });

  it('should return true for matching password and hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should return false for incorrect password', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword('WrongPassword123', hash);
    expect(isMatch).toBe(false);
  });
});
