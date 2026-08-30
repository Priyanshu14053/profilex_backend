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
   * Enforces account lockout policy:
   * - Wrong username: "Username incorrect"
   * - Wrong password 1st time: "Password incorrect. 2 attempts left"
   * - Wrong password 2nd time: "Password incorrect. 1 attempt left"
   * - Wrong password 3rd time: "Account locked. Contact admin"
   * - Account already locked: "Account locked. Contact admin"
   * - Login succeeds: attempts reset to 0 (3 available again)
   */
  async login(dto: LoginDto): Promise<AuthResponseData> {
    const identifier = dto.identifier.trim();
    const user = await this.userRepo.findByIdentifier(identifier);

    if (!user) {
      throw new UnauthorizedError('Username incorrect');
    }

    const isLocked = Boolean(user.is_locked) || (user.failed_attempts !== undefined && user.failed_attempts >= 3);
    if (isLocked) {
      throw new UnauthorizedError('Account locked. Contact admin');
    }

    const isMatch = await comparePassword(dto.password, user.password_hash);
    if (!isMatch) {
      const currentAttempts = user.failed_attempts ? Number(user.failed_attempts) : 0;
      const newAttempts = currentAttempts + 1;

      if (newAttempts >= 3) {
        await this.userRepo.lockAccount(user.id, 3);
        throw new UnauthorizedError('Account locked. Contact admin');
      } else {
        await this.userRepo.incrementFailedAttempts(user.id, newAttempts);
        const remaining = 3 - newAttempts;
        const attemptWord = remaining === 1 ? 'attempt' : 'attempts';
        throw new UnauthorizedError(`Password incorrect. ${remaining} ${attemptWord} left`);
      }
    }

    // Reset failed attempts upon successful login if user had prior failed attempts
    if (user.failed_attempts && Number(user.failed_attempts) > 0) {
      await this.userRepo.resetFailedAttempts(user.id);
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
