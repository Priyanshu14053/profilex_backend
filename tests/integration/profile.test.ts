import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import { userRepository } from '../../src/repositories/user.repository';
import { signJwt } from '../../src/utils/jwt';
import { env } from '../../src/config/env';

describe('Profile Endpoints (/api/v1/profile)', () => {
  const userId = '11111111-2222-3333-4444-555555555555';
  let validToken: string;

  beforeAll(() => {
    validToken = signJwt(userId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Middleware Checks', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('missing');
    });

    it('should return 401 when Authorization header does not use Bearer format', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Basic 12345');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Expected Bearer');
    });

    it('should return 401 for invalid JWT token signature', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for expired JWT token', async () => {
      const expiredToken = jwt.sign({ userId }, env.JWT.secret, { expiresIn: '0s' });
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expired');
    });
  });

  describe('GET /api/v1/profile', () => {
    it('should return authenticated user profile without password_hash', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue({
        id: userId,
        name: 'Priyanshu',
        email: 'user@example.com',
        mobile: '9876543210',
        dob: '2002-01-01',
        username: 'priyanshu',
        password_hash: 'secret_hash',
        created_at: '2026-08-30 20:00:00',
        updated_at: '2026-08-30 20:00:00',
      });

      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Profile retrieved successfully');
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.name).toBe('Priyanshu');
      expect(res.body.data.email).toBe('user@example.com');
      expect(res.body.data.mobile).toBe('9876543210');
      expect(res.body.data.dob).toBe('2002-01-01');
      expect(res.body.data.username).toBe('priyanshu');
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('should return 404 if user no longer exists in database', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User profile not found');
    });
  });

  describe('PUT /api/v1/profile', () => {
    const validUpdatePayload = {
      name: 'Updated Priyanshu',
      mobile: '9876543211',
      dob: '2002-01-02',
      username: 'updated_priyanshu',
    };

    it('should successfully update profile fields', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue({
        id: userId,
        name: 'Priyanshu',
        email: 'user@example.com',
        mobile: '9876543210',
        dob: '2002-01-01',
        username: 'priyanshu',
        password_hash: 'hash',
      });
      jest.spyOn(userRepository, 'findByUsernameExcludingId').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByMobileExcludingId').mockResolvedValue(null);
      jest.spyOn(userRepository, 'update').mockResolvedValue({
        id: userId,
        name: 'Updated Priyanshu',
        email: 'user@example.com',
        mobile: '9876543211',
        dob: '2002-01-02',
        username: 'updated_priyanshu',
        password_hash: 'hash',
      });

      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validUpdatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Profile updated successfully');
      expect(res.body.data.name).toBe('Updated Priyanshu');
      expect(res.body.data.username).toBe('updated_priyanshu');
      expect(res.body.data.mobile).toBe('9876543211');
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('should reject email modification attempts with 400', async () => {
      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...validUpdatePayload, email: 'newemail@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject client-provided userId with 400', async () => {
      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...validUpdatePayload, userId: 'other-user-uuid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 if new username is already taken by another user', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue({
        id: userId,
        name: 'Priyanshu',
        email: 'user@example.com',
        mobile: '9876543210',
        dob: '2002-01-01',
        username: 'priyanshu',
        password_hash: 'hash',
      });
      jest.spyOn(userRepository, 'findByUsernameExcludingId').mockResolvedValue({
        id: 'other-user-id',
        name: 'Other',
        email: 'other@example.com',
        mobile: '9999999999',
        dob: '2000-01-01',
        username: 'updated_priyanshu',
        password_hash: 'hash',
      });

      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validUpdatePayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username is already taken');
    });

    it('should return 409 if new mobile is already taken by another user', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue({
        id: userId,
        name: 'Priyanshu',
        email: 'user@example.com',
        mobile: '9876543210',
        dob: '2002-01-01',
        username: 'priyanshu',
        password_hash: 'hash',
      });
      jest.spyOn(userRepository, 'findByUsernameExcludingId').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByMobileExcludingId').mockResolvedValue({
        id: 'other-user-id',
        name: 'Other',
        email: 'other@example.com',
        mobile: '9876543211',
        dob: '2000-01-01',
        username: 'other',
        password_hash: 'hash',
      });

      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validUpdatePayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Mobile number is already registered');
    });
  });
});
