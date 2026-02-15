import {
  configureSSEPublisher,
  createApi,
  createServerRuntime,
} from '@repo/api/server';
import { createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import { buildStorageConfig } from './config';
import { env } from './env';

export const storageConfig = buildStorageConfig();

export const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });

export const auth = createAuth({
  webUrl: env.PUBLIC_WEB_URL,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  authSecret: env.SERVER_AUTH_SECRET,
  db,
});

configureSSEPublisher({
  redisUrl: env.SERVER_REDIS_URL,
  channelPrefix: env.SSE_REDIS_CHANNEL_PREFIX,
});

export const serverRuntime = createServerRuntime({
  db,
  storageConfig,
  useMockAI: env.USE_MOCK_AI,
  geminiApiKey: env.GEMINI_API_KEY,
});

export const api = createApi({
  auth,
  serverRuntime,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});
