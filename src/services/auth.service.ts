import { v4 as uuidv4 } from 'uuid';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { loginHistoryRepository, LoginHistoryRepository } from '../repositories/login-history.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { signJwt } from '../utils/jwt';
import { ConflictError, UnauthorizedError, TooManyRequestsError } from '../utils/errors';
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
  identifier?: string;
  username?: string;
  email?: string;
  password: string;
}

export interface LoginMetadata {
  ip_address?: string;
  user_agent?: string;
}

const parseLockUntilTime = (lockUntilVal: any): number | null => {
  if (!lockUntilVal) return null;
  if (lockUntilVal instanceof Date) return lockUntilVal.getTime();
  const str = String(lockUntilVal);
  const time = new Date(str.includes('T') ? str : str.replace(' ', 'T')).getTime();
  return isNaN(time) ? null : time;
};

export class AuthService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private loginHistoryRepo: LoginHistoryRepository = loginHistoryRepository
  ) {}

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
   * Enforces 3-failed-attempt lockout policy:
   * - Wrong identifier: "Username or email not found" (HTTP 401)
   * - 1st failed attempt: "Invalid password. 2 attempts remaining." (HTTP 401)
   * - 2nd failed attempt: "Invalid password. 1 attempt remaining." (HTTP 401)
   * - 3rd failed attempt: Lockout for 30s (HTTP 429)
   * - Account currently locked: Lockout error with remaining seconds (HTTP 429)
   * - Login succeeds: attempts reset to 0 and lockUntil = null
   */
  async login(dto: LoginDto, meta?: LoginMetadata): Promise<AuthResponseData> {
    const identifier = (dto.identifier || dto.username || dto.email || '').toLowerCase().trim();
    const user = await this.userRepo.findByIdentifier(identifier);

    if (!user) {
      await this.loginHistoryRepo
        .create({
          user_id: null,
          identifier,
          status: 'FAILED',
          failure_reason: 'Username or email not found',
          ip_address: meta?.ip_address,
          user_agent: meta?.user_agent,
        })
        .catch((err) => console.warn(`[LoginHistory] Failed to log: ${err.message}`));
      throw new UnauthorizedError('Username or email not found');
    }

    const lockUntilVal = user.lock_until || user.lockUntil;
    const lockUntilTime = parseLockUntilTime(lockUntilVal);
    const now = Date.now();

    // Check if account is currently locked (active 30s lockout or legacy lock)
    const isCurrentlyLocked = (lockUntilTime !== null && lockUntilTime > now) ||
      (lockUntilTime === null && Boolean(user.is_locked));

    if (isCurrentlyLocked) {
      const secondsLeft = lockUntilTime ? Math.max(1, Math.ceil((lockUntilTime - now) / 1000)) : 30;
      const message = `Account is locked. Please try again in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}.`;

      const failureData = {
        attemptsRemaining: 0,
        maxAttempts: 3,
        failedAttempts: user.failedAttempts !== undefined ? Number(user.failedAttempts) : (user.failed_attempts ? Number(user.failed_attempts) : 3),
        accountLocked: true,
        ...(lockUntilVal ? { lockUntil: typeof lockUntilVal === 'string' ? lockUntilVal : (lockUntilVal as any).toISOString?.() || String(lockUntilVal) } : {}),
      };

      await this.loginHistoryRepo
        .create({
          user_id: user.id,
          identifier,
          status: 'LOCKED',
          failure_reason: message,
          ip_address: meta?.ip_address,
          user_agent: meta?.user_agent,
        })
        .catch((err) => console.warn(`[LoginHistory] Failed to log: ${err.message}`));

      throw new TooManyRequestsError(message, failureData);
    }

    const isMatch = await comparePassword(dto.password, user.password_hash);
    if (!isMatch) {
      // If previous lock expired, reset base attempts to 0 for a fresh cycle
      const baseAttempts = (lockUntilTime !== null && lockUntilTime <= now)
        ? 0
        : (user.failedAttempts !== undefined ? Number(user.failedAttempts) : (user.failed_attempts ? Number(user.failed_attempts) : 0));
      const newAttempts = baseAttempts + 1;

      if (newAttempts >= 3) {
        const lockoutDurationMs = 30 * 1000;
        const lockUntil = new Date(Date.now() + lockoutDurationMs);
        await this.userRepo.lockAccount(user.id, 3, lockUntil);
        const lockUntilIso = lockUntil.toISOString();

        const failureData = {
          attemptsRemaining: 0,
          maxAttempts: 3,
          failedAttempts: 3,
          accountLocked: true,
          lockUntil: lockUntilIso,
        };

        const message = 'Account locked due to too many failed attempts. Try again in 30 seconds.';

        await this.loginHistoryRepo
          .create({
            user_id: user.id,
            identifier,
            status: 'LOCKED',
            failure_reason: `${message} (3 failed attempts)`,
            ip_address: meta?.ip_address,
            user_agent: meta?.user_agent,
          })
          .catch((err) => console.warn(`[LoginHistory] Failed to log: ${err.message}`));

        throw new TooManyRequestsError(message, failureData);
      } else {
        await this.userRepo.incrementFailedAttempts(user.id, newAttempts);
        const remaining = 3 - newAttempts;
        const attemptWord = remaining === 1 ? 'attempt' : 'attempts';
        const message = `Invalid password. ${remaining} ${attemptWord} remaining.`;

        const failureData = {
          attemptsRemaining: remaining,
          maxAttempts: 3,
          failedAttempts: newAttempts,
          accountLocked: false,
        };

        await this.loginHistoryRepo
          .create({
            user_id: user.id,
            identifier,
            status: 'FAILED',
            failure_reason: message,
            ip_address: meta?.ip_address,
            user_agent: meta?.user_agent,
          })
          .catch((err) => console.warn(`[LoginHistory] Failed to log: ${err.message}`));

        throw new UnauthorizedError(message, failureData);
      }
    }

    // Reset failed attempts and lock status upon successful login if user had prior failed attempts or lock
    if (
      (user.failed_attempts && Number(user.failed_attempts) > 0) ||
      Boolean(user.is_locked) ||
      user.lock_until ||
      user.lockUntil
    ) {
      await this.userRepo.resetFailedAttempts(user.id);
    }

    // Record successful login in history
    await this.loginHistoryRepo
      .create({
        user_id: user.id,
        identifier,
        status: 'SUCCESS',
        failure_reason: null,
        ip_address: meta?.ip_address,
        user_agent: meta?.user_agent,
      })
      .catch((err) => console.warn(`[LoginHistory] Failed to log: ${err.message}`));

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
