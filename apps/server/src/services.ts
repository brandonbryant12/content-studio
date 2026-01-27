import {
  createApi,
  createServerRuntime,
  createSSEManager,
} from '@repo/api/server';
import { createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import { storageConfig } from './config';
import { env } from './env';

/**
 * Shared services created once at startup.
 * These are used by both the HTTP server and background workers.
 */

export { storageConfig };

export const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });

export const auth = createAuth({
  webUrl: env.PUBLIC_WEB_URL,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  authSecret: env.SERVER_AUTH_SECRET,
  db,
});

export const serverRuntime = createServerRuntime({
  db,
  geminiApiKey: env.GEMINI_API_KEY,
  storageConfig,
  useMockAI: env.USE_MOCK_AI,
});

export const sseManager = createSSEManager();

export const api = createApi({
  auth,
  serverRuntime,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});
