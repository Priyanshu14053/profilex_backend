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
 * Tests connectivity to the remote Aiven MySQL database without exposing credentials
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log(`[Database] Successfully connected to hosted MySQL database: ${env.DB.database} on ${env.DB.host}:${env.DB.port}`);
    return true;
  } catch (error: any) {
    console.error(`[Database] Connection test failed: ${error.message || error}`);
    console.error(`[Database] Code: ${error.code || 'UNKNOWN'}, Errno: ${error.errno || 'UNKNOWN'}`);
    return false;
  }
};
