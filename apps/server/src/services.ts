import { createApi, createServerRuntime } from '@repo/api/server';
import { createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import type { VertexAIConfig } from '@repo/ai';
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

const vertexConfig: VertexAIConfig | undefined =
  env.AI_PROVIDER !== 'vertex'
    ? undefined
    : env.GOOGLE_VERTEX_API_KEY
      ? { mode: 'express', apiKey: env.GOOGLE_VERTEX_API_KEY }
      : {
          mode: 'serviceAccount',
          project: env.GOOGLE_VERTEX_PROJECT!,
          location: env.GOOGLE_VERTEX_LOCATION!,
          imageGenApiKey: env.GEMINI_API_KEY,
        };

export const serverRuntime = createServerRuntime({
  db,
  storageConfig,
  useMockAI: env.USE_MOCK_AI,
  aiProvider: env.AI_PROVIDER,
  geminiApiKey: env.GEMINI_API_KEY,
  vertexConfig,
});

export const api = createApi({
  auth,
  serverRuntime,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});
