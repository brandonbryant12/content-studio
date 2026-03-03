/* eslint-disable no-console -- Worker entry point: lifecycle logging before/after Effect runtime */
// Configure proxy FIRST before any network requests
// eslint-disable-next-line import/order -- Must execute before any other imports make network requests
import { configureProxy } from './proxy';
configureProxy();

import {
  configureSSEPublisher,
  createServerRuntime,
  shutdownSSEPublisher,
  ssePublisher,
} from '@repo/api/server';
import { createDb, verifyDbConnection } from '@repo/db/client';
import { configureQueueNotifier, shutdownQueueNotifier } from '@repo/queue';
import { buildStorageConfig } from './config';
import {
  DEFAULT_PER_TYPE_CONCURRENCY,
  MAX_CONCURRENT_JOBS,
  QUEUE_DEFAULTS,
} from './constants';
import { env } from './env';
import { createUnifiedWorker } from './unified-worker';

let isFatalExiting = false;
const fatalExit = async (context: string, error?: unknown): Promise<void> => {
  if (isFatalExiting) return;
  isFatalExiting = true;

  console.error(context, error instanceof Error ? error.message : error);
  process.exit(1);
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Promise Rejection:', {
    reason:
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : reason,
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  void fatalExit('[FATAL] Uncaught Exception:', error);
});

async function startWorker(): Promise<void> {
  console.log('Verifying database connection...');

  const db = createDb({
    databaseUrl: env.SERVER_POSTGRES_URL,
    max: 5,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 10_000,
  });
  const storageConfig = buildStorageConfig();

  configureSSEPublisher({
    redisUrl: env.SERVER_REDIS_URL,
    channelPrefix: env.SSE_REDIS_CHANNEL_PREFIX,
  });

  configureQueueNotifier({
    redisUrl: env.SERVER_REDIS_URL,
    channel: env.QUEUE_NOTIFY_CHANNEL,
  });

  try {
    await verifyDbConnection(db);
    console.log('Database connection verified');
  } catch (error) {
    await fatalExit('Failed to start worker:', error);
    return;
  }

  const serverRuntime = createServerRuntime({
    db,
    storageConfig,
    useMockAI: env.USE_MOCK_AI,
    geminiApiKey: env.GEMINI_API_KEY,
    telemetryConfig: {
      enabled: env.TELEMETRY_ENABLED,
      serviceName: env.OTEL_SERVICE_NAME ?? 'content-studio-worker',
      serviceVersion: env.OTEL_SERVICE_VERSION,
      environment: env.OTEL_ENV,
      otlpTracesEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      otlpHeaders: env.OTEL_EXPORTER_OTLP_HEADERS,
    },
  });

  const worker = createUnifiedWorker({
    pollInterval: QUEUE_DEFAULTS.POLL_INTERVAL_MS,
    runtime: serverRuntime,
    publishEvent: (userId, event) => ssePublisher.publish(userId, event),
  });

  worker.start().catch((error) => {
    void fatalExit('Worker error:', error);
  });

  console.log(
    `Worker started\n` +
      `- heartbeat poll interval: ${QUEUE_DEFAULTS.POLL_INTERVAL_MS}ms\n` +
      `- max concurrent jobs (global): ${MAX_CONCURRENT_JOBS}\n` +
      `- per-type concurrency: ${JSON.stringify(DEFAULT_PER_TYPE_CONCURRENCY)}\n` +
      `- mock AI: ${env.USE_MOCK_AI}`,
  );

  let isShuttingDown = false;
  const SHUTDOWN_TIMEOUT_MS = 30_000;

  async function shutdown(): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\nShutting down gracefully...');

    const forceTimer = setTimeout(() => {
      void fatalExit('Graceful shutdown timed out, forcing exit');
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      await worker.stop();
      console.log('Worker stopped');

      console.log('Disposing Effect runtime...');
      await serverRuntime.dispose();
      console.log('Effect runtime disposed');

      await db.$client.end();
      console.log('Database pool closed');

      await shutdownSSEPublisher();
      console.log('SSE publisher stopped');

      await shutdownQueueNotifier();
      console.log('Queue notifier stopped');

      console.log('Worker has stopped gracefully.');
    } catch (error) {
      console.error('Error during shutdown:', error);
    } finally {
      process.exit(0);
    }
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startWorker();
