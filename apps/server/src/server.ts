import { serve } from '@hono/node-server';
import { env } from './env';
import app from '.';
import { createPodcastWorker } from './workers/podcast-worker';

// Start the podcast worker
const worker = createPodcastWorker({
  databaseUrl: env.SERVER_POSTGRES_URL,
  pollInterval: 3000, // Poll every 3 seconds
});

worker.start().catch((error) => {
  console.error('Worker error:', error);
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
