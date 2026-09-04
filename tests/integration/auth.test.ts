import request from 'supertest';
import { app } from '../../src/app';
import { userRepository } from '../../src/repositories/user.repository';
import { loginHistoryRepository } from '../../src/repositories/login-history.repository';
import { hashPassword } from '../../src/utils/password';
import { signJwt } from '../../src/utils/jwt';

describe('Auth Endpoints (/api/v1/auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(loginHistoryRepository, 'create').mockResolvedValue();
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegisterPayload = {
      name: 'Priyanshu',
      email: 'user@example.com',
      mobile: '9876543210',
      dob: '2002-01-01',
      username: 'priyanshu',
      password: 'Password123',
    };

    it('should successfully register a valid user', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByMobile').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockImplementation(async (data) => ({
        ...data,
        created_at: '2026-08-30 20:00:00',
        updated_at: '2026-08-30 20:00:00',
      }));

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegisterPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Priyanshu');
      expect(res.body.data.email).toBe('user@example.com');
      expect(res.body.data.username).toBe('priyanshu');
      expect(res.body.data.mobile).toBe('9876543210');
      expect(res.body.data.dob).toBe('2002-01-01');
      // Must NEVER return password_hash
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('should return 409 when email already exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue({
        id: 'existing-id',
        name: 'Existing',
        email: 'user@example.com',
        mobile: '1111111111',
        dob: '2000-01-01',
        username: 'existing',
        password_hash: 'hash',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegisterPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email is already registered');
    });

    it('should return 409 when username already exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue({
        id: 'existing-id',
        name: 'Existing',
        email: 'other@example.com',
        mobile: '1111111111',
        dob: '2000-01-01',
        username: 'priyanshu',
        password_hash: 'hash',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegisterPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username is already taken');
    });

    it('should return 409 when mobile already exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByMobile').mockResolvedValue({
        id: 'existing-id',
        name: 'Existing',
        email: 'other@example.com',
        mobile: '9876543210',
        dob: '2000-01-01',
        username: 'other',
        password_hash: 'hash',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegisterPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Mobile number is already registered');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors[0].message).toBe('Please enter a valid email address');
    });

    it('should return 400 for email with consecutive dots', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, email: 'john..doe@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toBe('Please enter a valid email address');
    });

    it('should return 400 for invalid name containing numbers or symbols', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, name: 'John123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toBe('Name must contain only alphabets');
    });

    it('should return 400 for invalid mobile number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, mobile: '1234567890' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toBe('Mobile number must be 10 digits and start with 7, 8, or 9');
    });

    it('should return 400 for DOB in the future', async () => {
      const futureDate = '2099-01-01';
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, dob: futureDate });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toBe('Date of birth cannot be in the future');
    });

    it('should return 400 for DOB user younger than 13 years', async () => {
      const recentDate = '2022-01-01';
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, dob: recentDate });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toBe('You must be at least 13 years old');
    });

    it('should return 400 for invalid username with special chars', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, username: 'user@name!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toBe('Username must be 3-50 chars, letters/numbers/underscore only');
    });

    it('should return 400 for weak password (no numbers or too short)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toBe('Password must be at least 8 characters and contain at least 1 letter and 1 number');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Only Name' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login - Account Lockout Policy', () => {
    let hashedPassword = '';

    beforeAll(async () => {
      hashedPassword = await hashPassword('Password123');
    });

    const mockUser = {
      id: 'test-user-uuid',
      name: 'Priyanshu',
      email: 'user@example.com',
      mobile: '9876543210',
      dob: '2002-01-01',
      username: 'priyanshu',
      created_at: '2026-08-30 20:00:00',
      updated_at: '2026-08-30 20:00:00',
    };

    it('should return 401 with "Username incorrect" for wrong username/identifier', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'wrong_username', password: 'Password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username incorrect');
    });

    it('should return 401 with remaining attempts and mobile JSON structure on 1st failed attempt', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 0,
      });
      const incrementSpy = jest.spyOn(userRepository, 'incrementFailedAttempts').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'priyanshu', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid password. 2 attempts remaining.');
      expect(res.body.data).toEqual({
        attemptsRemaining: 2,
        maxAttempts: 3,
        failedAttempts: 1,
        accountLocked: false,
      });
      expect(incrementSpy).toHaveBeenCalledWith('test-user-uuid', 1);
    });

    it('should return 401 with remaining attempts and mobile JSON structure on 2nd failed attempt', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 1,
      });
      const incrementSpy = jest.spyOn(userRepository, 'incrementFailedAttempts').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'priyanshu', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid password. 1 attempt remaining.');
      expect(res.body.data).toEqual({
        attemptsRemaining: 1,
        maxAttempts: 3,
        failedAttempts: 2,
        accountLocked: false,
      });
      expect(incrementSpy).toHaveBeenCalledWith('test-user-uuid', 2);
    });

    it('should lock account for 30s and return 429 on 3rd failed attempt', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 2,
      });
      const lockSpy = jest.spyOn(userRepository, 'lockAccount').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'priyanshu', password: 'WrongPassword' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Account locked due to too many failed attempts');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.attemptsRemaining).toBe(0);
      expect(res.body.data.maxAttempts).toBe(3);
      expect(res.body.data.failedAttempts).toBe(3);
      expect(res.body.data.accountLocked).toBe(true);
      expect(res.body.data.lockUntil).toBeDefined();
      expect(lockSpy).toHaveBeenCalledWith('test-user-uuid', 3, expect.any(Date));
    });

    it('should reject login immediately if account is currently locked', async () => {
      const futureLock = new Date(Date.now() + 20000).toISOString();
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 3,
        is_locked: 1,
        lock_until: futureLock,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'priyanshu', password: 'Password123' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Account is locked');
      expect(res.body.data).toEqual({
        attemptsRemaining: 0,
        maxAttempts: 3,
        failedAttempts: 3,
        accountLocked: true,
        lockUntil: futureLock,
      });
    });

    it('should successfully log in with email and reset failed attempts to 0', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 1,
      });
      const resetSpy = jest.spyOn(userRepository, 'resetFailedAttempts').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'user@example.com', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.id).toBe(mockUser.id);
      expect(res.body.data.user.email).toBe(mockUser.email);
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(resetSpy).toHaveBeenCalledWith('test-user-uuid');
    });

    it('should successfully log in with username when 0 failed attempts', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 0,
      });
      const resetSpy = jest.spyOn(userRepository, 'resetFailedAttempts').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'priyanshu', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(resetSpy).not.toHaveBeenCalled();
    });

    it('should log successful login to login history repository with client metadata', async () => {
      const historySpy = jest.spyOn(loginHistoryRepository, 'create').mockResolvedValue();
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 0,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Mozilla/5.0 TestBrowser')
        .set('X-Forwarded-For', '203.0.113.195')
        .send({ identifier: 'priyanshu', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(historySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-uuid',
          identifier: 'priyanshu',
          status: 'SUCCESS',
          failure_reason: null,
          ip_address: '203.0.113.195',
          user_agent: 'Mozilla/5.0 TestBrowser',
        })
      );
    });

    it('should log failed login to login history repository when password is wrong', async () => {
      const historySpy = jest.spyOn(loginHistoryRepository, 'create').mockResolvedValue();
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        failed_attempts: 0,
      });
      jest.spyOn(userRepository, 'incrementFailedAttempts').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'TestMobileApp')
        .send({ identifier: 'priyanshu', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(historySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-uuid',
          identifier: 'priyanshu',
          status: 'FAILED',
          failure_reason: 'Invalid password. 2 attempts remaining.',
          user_agent: 'TestMobileApp',
        })
      );
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 when logging out with valid JWT', async () => {
      const token = signJwt('test-user-uuid');
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logout successful');
    });

    it('should return 401 when logging out without token', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
