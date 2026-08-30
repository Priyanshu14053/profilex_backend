import { app } from './app';
import { env } from './config/env';
import { testDatabaseConnection, pool } from './config/database';

const startServer = async (): Promise<void> => {
  console.log(`[Server] Starting ProfileX Backend API in ${env.NODE_ENV} mode...`);

  // Verify Aiven MySQL Database Connection on bootstrap
  const isDbConnected = await testDatabaseConnection();
  if (!isDbConnected) {
    console.warn(
      '[Database Warning] Could not connect to remote Aiven MySQL database on startup. Please verify DB credentials in .env.'
    );
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[Server] ProfileX Backend API listening on port ${env.PORT}`);
    console.log(`[Server] Health check available at: http://localhost:${env.PORT}/health`);
    console.log(`[Server] API v1 base route: http://localhost:${env.PORT}/api/v1`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      try {
        await pool.end();
        console.log('[Database] MySQL connection pool drained and closed.');
      } catch (err) {
        console.error('[Database] Error closing MySQL pool:', err);
      }
      process.exit(0);
    });

    // Force shutdown if taking too long
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('[Server] Fatal error during startup:', error);
  process.exit(1);
});
