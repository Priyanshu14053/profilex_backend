import { ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import {
  LoginHistory,
  LoginHistoryCreateInput,
  LoginHistoryRow,
} from '../models/login-history.model';

export class LoginHistoryRepository {
  /**
   * Records a login attempt (success, failed, or locked)
   */
  async create(data: LoginHistoryCreateInput): Promise<void> {
    const sql = `
      INSERT INTO login_history (
        user_id,
        identifier,
        status,
        failure_reason,
        ip_address,
        user_agent
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.execute<ResultSetHeader>(sql, [
      data.user_id || null,
      data.identifier,
      data.status,
      data.failure_reason || null,
      data.ip_address || null,
      data.user_agent || null,
    ]);
  }

  /**
   * Retrieves login history for a specific user
   */
  async findByUserId(userId: string, limit: number = 50): Promise<LoginHistory[]> {
    const sql = `
      SELECT
        id,
        user_id,
        identifier,
        status,
        failure_reason,
        ip_address,
        user_agent,
        attempted_at
      FROM login_history
      WHERE user_id = ?
      ORDER BY attempted_at DESC
      LIMIT ?
    `;

    const [rows] = await pool.query<LoginHistoryRow[]>(sql, [userId, limit]);
    return rows;
  }

  /**
   * Retrieves recent login history across all users
   */
  async findAll(limit: number = 100): Promise<LoginHistory[]> {
    const sql = `
      SELECT
        id,
        user_id,
        identifier,
        status,
        failure_reason,
        ip_address,
        user_agent,
        attempted_at
      FROM login_history
      ORDER BY attempted_at DESC
      LIMIT ?
    `;

    const [rows] = await pool.query<LoginHistoryRow[]>(sql, [limit]);
    return rows;
  }
}

export const loginHistoryRepository = new LoginHistoryRepository();
