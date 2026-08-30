import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  DB: {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
    sslRejectUnauthorized: boolean;
    caCertPath?: string;
  };
  JWT: {
    secret: string;
    expiresIn: string;
  };
  CORS_ORIGIN: string;
}

export const env: AppConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DB: {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'profilex',
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    caCertPath: process.env.DB_CA_CERT || undefined,
  },
  JWT: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
