import { serve } from '@hono/node-server';
import { createDb, verifyDbConnection } from '@repo/db/client';
import { env } from './env';
import { createPodcastWorker } from './workers/podcast-worker';
import app, { storageConfig } from '.';

const startServer = async () => {
  // Verify database connection before starting
  console.log('Verifying database connection...');
  const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });

  try {
    await verifyDbConnection(db);
    console.log('Database connection verified');
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Start the podcast worker
  const worker = createPodcastWorker({
    databaseUrl: env.SERVER_POSTGRES_URL,
    pollInterval: 3000, // Poll every 3 seconds
    geminiApiKey: env.GEMINI_API_KEY,
    storageConfig,
  });

  worker.start().catch((error) => {
    console.error('Worker error:', error);
    process.exit(1);
  });

  const server = serve(
    {
      fetch: app.fetch,
      port: env.SERVER_PORT,
      hostname: env.SERVER_HOST,
    },
    (info) => {
      const host = info.family === 'IPv6' ? `[${info.address}]` : info.address;
      console.log(`
Hono
- internal server url: http://${host}:${info.port}
- external server url: ${env.PUBLIC_SERVER_URL}
- public web url: ${env.PUBLIC_WEB_URL}
      `);
    },
  );

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error(error);
      } else {
        console.log('\nServer has stopped gracefully.');
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
