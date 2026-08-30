import { v4 as uuidv4 } from 'uuid';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { signJwt } from '../utils/jwt';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { AuthResponseData, UserProfileResponse } from '../models/user.model';

export interface RegisterDto {
  name: string;
  email: string;
  mobile: string;
  dob: string;
  username: string;
  password: string;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  /**
   * Registers a new user with duplicate checks and bcrypt password hashing
   */
  async register(dto: RegisterDto): Promise<UserProfileResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = dto.username.trim().toLowerCase();
    const normalizedMobile = dto.mobile.trim();

    // 1. Check if email already exists
    const existingEmail = await this.userRepo.findByEmail(normalizedEmail);
    if (existingEmail) {
      throw new ConflictError('Email is already registered');
    }

    // 2. Check if username already exists
    const existingUsername = await this.userRepo.findByUsername(normalizedUsername);
    if (existingUsername) {
      throw new ConflictError('Username is already taken');
    }

    // 3. Check if mobile already exists
    const existingMobile = await this.userRepo.findByMobile(normalizedMobile);
    if (existingMobile) {
      throw new ConflictError('Mobile number is already registered');
    }

    // Hash password with bcrypt cost factor 12
    const passwordHash = await hashPassword(dto.password);
    const userId = uuidv4();

    // Create user in database
    const createdUser = await this.userRepo.create({
      id: userId,
      name: dto.name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      dob: dto.dob.trim(),
      username: normalizedUsername,
      password_hash: passwordHash,
    });

    return {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      mobile: createdUser.mobile,
      dob: String(createdUser.dob).split('T')[0],
      username: createdUser.username,
    };
  }

  /**
   * Logs in a user by identifier (email or username) and password
   */
  async login(dto: LoginDto): Promise<AuthResponseData> {
    const identifier = dto.identifier.trim();
    const user = await this.userRepo.findByIdentifier(identifier);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await comparePassword(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT token containing only userId
    const token = signJwt(user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        dob: String(user.dob).split('T')[0],
        username: user.username,
      },
    };
  }
}

export const authService = new AuthService();
