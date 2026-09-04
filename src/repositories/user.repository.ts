import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { User, UserCreateInput, UserRow, UserUpdateInput } from '../models/user.model';

export const mapUser = (row: any): User | null => {
  if (!row) return null;
  const failedAttempts = row.failedAttempts !== undefined
    ? Number(row.failedAttempts)
    : (row.failed_attempts !== undefined ? Number(row.failed_attempts) : 0);
  const lockUntil = row.lockUntil !== undefined
    ? (row.lockUntil || null)
    : (row.lock_until || null);

  return {
    ...row,
    failed_attempts: failedAttempts,
    failedAttempts,
    lock_until: lockUntil,
    lockUntil,
  };
};

export class UserRepository {
  /**
   * Finds a user by primary key ID
   */
  async findById(id: string): Promise<User | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash,
        failed_attempts,
        failed_attempts AS failedAttempts,
        is_locked,
        locked_at,
        lock_until,
        lock_until AS lockUntil,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute<UserRow[]>(sql, [id]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  /**
   * Finds a user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash,
        failed_attempts,
        failed_attempts AS failedAttempts,
        is_locked,
        locked_at,
        lock_until,
        lock_until AS lockUntil,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `;
    const [rows] = await pool.execute<UserRow[]>(sql, [email.trim()]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  /**
   * Finds a user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash,
        failed_attempts,
        failed_attempts AS failedAttempts,
        is_locked,
        locked_at,
        lock_until,
        lock_until AS lockUntil,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(username) = LOWER(?)
      LIMIT 1
    `;
    const [rows] = await pool.execute<UserRow[]>(sql, [username.trim()]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  /**
   * Finds a user by mobile number
   */
  async findByMobile(mobile: string): Promise<User | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash,
        failed_attempts,
        failed_attempts AS failedAttempts,
        is_locked,
        locked_at,
        lock_until,
        lock_until AS lockUntil,
        created_at,
        updated_at
      FROM users
      WHERE mobile = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute<UserRow[]>(sql, [mobile.trim()]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  /**
   * Finds a user by identifier (either email or username)
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash,
        failed_attempts,
        failed_attempts AS failedAttempts,
        is_locked,
        locked_at,
        lock_until,
        lock_until AS lockUntil,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
      LIMIT 1
    `;
    const cleanId = identifier.trim().toLowerCase();
    const [rows] = await pool.execute<UserRow[]>(sql, [cleanId, cleanId]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  /**
   * Checks if username is taken by any user OTHER than excludeId
   */
  async findByUsernameExcludingId(username: string, excludeId: string): Promise<User | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(username) = LOWER(?) AND id != ?
      LIMIT 1
    `;
    const [rows] = await pool.execute<UserRow[]>(sql, [username.trim(), excludeId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Checks if mobile is taken by any user OTHER than excludeId
   */
  async findByMobileExcludingId(mobile: string, excludeId: string): Promise<User | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE mobile = ? AND id != ?
      LIMIT 1
    `;
    const [rows] = await pool.execute<UserRow[]>(sql, [mobile.trim(), excludeId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Creates a new user row using parameterized INSERT
   */
  async create(user: UserCreateInput): Promise<User> {
    const sql = `
      INSERT INTO users (
        id,
        name,
        email,
        mobile,
        dob,
        username,
        password_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.execute<ResultSetHeader>(sql, [
      user.id,
      user.name,
      user.email,
      user.mobile,
      user.dob,
      user.username,
      user.password_hash,
    ]);

    const created = await this.findById(user.id);
    if (!created) {
      throw new Error('Failed to retrieve newly created user.');
    }
    return created;
  }

  /**
   * Updates user profile fields (excluding email and id)
   */
  async update(id: string, updateData: UserUpdateInput): Promise<User | null> {
    const sql = `
      UPDATE users
      SET
        name = ?,
        mobile = ?,
        dob = ?,
        username = ?
      WHERE id = ?
    `;
    await pool.execute<ResultSetHeader>(sql, [
      updateData.name,
      updateData.mobile,
      updateData.dob,
      updateData.username,
      id,
    ]);

    return this.findById(id);
  }

  /**
   * Increments failed login attempts for a user
   */
  async incrementFailedAttempts(userId: string, attempts: number): Promise<void> {
    const sql = `
      UPDATE users
      SET failed_attempts = ?
      WHERE id = ?
    `;
    await pool.execute<ResultSetHeader>(sql, [attempts, userId]);
  }

  /**
   * Locks user account and sets failed attempts and lockout expiration
   */
  async lockAccount(userId: string, attempts: number = 3, lockUntil?: Date | string | null): Promise<void> {
    const formattedLockUntil = lockUntil instanceof Date
      ? lockUntil.toISOString().slice(0, 19).replace('T', ' ')
      : (lockUntil || null);

    const sql = `
      UPDATE users
      SET
        failed_attempts = ?,
        is_locked = 1,
        locked_at = CURRENT_TIMESTAMP,
        lock_until = ?
      WHERE id = ?
    `;
    await pool.execute<ResultSetHeader>(sql, [attempts, formattedLockUntil, userId]);
  }

  /**
   * Resets failed login attempts and unlocks account
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    const sql = `
      UPDATE users
      SET
        failed_attempts = 0,
        is_locked = 0,
        locked_at = NULL,
        lock_until = NULL
      WHERE id = ?
    `;
    await pool.execute<ResultSetHeader>(sql, [userId]);
  }

  /**
   * Unlocks an account and resets failed attempts
   */
  async unlockAccount(userId: string): Promise<void> {
    const sql = `
      UPDATE users
      SET
        is_locked = 0,
        failed_attempts = 0,
        locked_at = NULL,
        lock_until = NULL
      WHERE id = ?
    `;
    await pool.execute<ResultSetHeader>(sql, [userId]);
  }
}

export const userRepository = new UserRepository();
