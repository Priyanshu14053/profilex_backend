import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import fs from 'fs';
import { env } from './env';

const buildPoolOptions = (): PoolOptions => {
  const options: PoolOptions = {
    host: env.DB.host,
    port: env.DB.port,
    user: env.DB.user,
    password: env.DB.password,
    database: env.DB.database,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    connectTimeout: 10000,
    dateStrings: true, // Returns date columns as strings (e.g. YYYY-MM-DD)
  };

  // Configure TLS / SSL for remote hosted MySQL (e.g., Aiven MySQL)
  if (env.DB.caCertPath) {
    let ca: string | undefined;
    if (fs.existsSync(env.DB.caCertPath)) {
      ca = fs.readFileSync(env.DB.caCertPath, 'utf8');
    } else if (env.DB.caCertPath.includes('BEGIN CERTIFICATE')) {
      ca = env.DB.caCertPath;
    }
    if (ca) {
      options.ssl = {
        ca,
        rejectUnauthorized: env.DB.sslRejectUnauthorized,
      };
      return options;
    }
  }

  // Default SSL mode for cloud databases (like Aiven)
  options.ssl = {
    rejectUnauthorized: env.DB.sslRejectUnauthorized,
  };

  return options;
};

// Create the connection pool
export const pool: Pool = mysql.createPool(buildPoolOptions());

/**
 * Ensures required database schema columns exist (idempotent migration)
 */
export const ensureSchemaMigrations = async (connectionPool: Pool = pool): Promise<void> => {
  try {
    const [cols]: any = await connectionPool.query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      ['users']
    );
    const colNames = Array.isArray(cols) ? cols.map((c: any) => c.COLUMN_NAME) : [];

    if (colNames.length > 0) {
      if (!colNames.includes('failed_attempts')) {
        await connectionPool.query('ALTER TABLE users ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0');
        console.log('[Database] Migrated column: failed_attempts');
      }
      if (!colNames.includes('is_locked')) {
        await connectionPool.query('ALTER TABLE users ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0');
        console.log('[Database] Migrated column: is_locked');
      }
      if (!colNames.includes('locked_at')) {
        await connectionPool.query('ALTER TABLE users ADD COLUMN locked_at TIMESTAMP NULL DEFAULT NULL');
        console.log('[Database] Migrated column: locked_at');
      }
    }
  } catch (err: any) {
    console.warn(`[Database] Schema migration warning: ${err.message || err}`);
  }
};

/**
 * Tests connectivity to the remote Aiven MySQL database without exposing credentials
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log(`[Database] Successfully connected to hosted MySQL database: ${env.DB.database} on ${env.DB.host}:${env.DB.port}`);
    await ensureSchemaMigrations(pool);
    return true;
  } catch (error: any) {
    console.error(`[Database] Connection test failed: ${error.message || error}`);
    console.error(`[Database] Code: ${error.code || 'UNKNOWN'}, Errno: ${error.errno || 'UNKNOWN'}`);
    return false;
  }
};
