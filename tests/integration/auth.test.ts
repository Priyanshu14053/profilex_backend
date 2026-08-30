import request from 'supertest';
import { app } from '../../src/app';
import { userRepository } from '../../src/repositories/user.repository';
import { hashPassword } from '../../src/utils/password';
import { signJwt } from '../../src/utils/jwt';

describe('Auth Endpoints (/api/v1/auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    });

    it('should return 400 for weak password (no numbers or too short)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegisterPayload, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Only Name' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
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
      password_hash: '',
    };

    it('should successfully log in with email and valid password', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

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
    });

    it('should successfully log in with username and valid password', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'priyanshu', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should return 401 for incorrect password', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'priyanshu', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for unknown identifier', async () => {
      jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'nonexistent', password: 'Password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
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
