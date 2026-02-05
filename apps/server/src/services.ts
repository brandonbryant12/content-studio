import {
  createApi,
  createServerRuntime,
  createSSEManager,
} from '@repo/api/server';
import type { VertexAIConfig } from '@repo/ai';
import { createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import { buildStorageConfig } from './config';
import { env } from './env';

/**
 * Shared services created once at startup.
 * These are used by both the HTTP server and background workers.
 */

export const storageConfig = buildStorageConfig();

export const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });

export const auth = createAuth({
  webUrl: env.PUBLIC_WEB_URL,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  authSecret: env.SERVER_AUTH_SECRET,
  db,
});

// Build Vertex AI config if using vertex provider
const buildVertexConfig = (): VertexAIConfig | undefined => {
  if (env.AI_PROVIDER !== 'vertex') return undefined;

  // Express mode takes precedence if API key is provided
  if (env.GOOGLE_VERTEX_API_KEY) {
    return {
      mode: 'express',
      apiKey: env.GOOGLE_VERTEX_API_KEY,
    };
  }

  // Service account mode
  return {
    mode: 'serviceAccount',
    project: env.GOOGLE_VERTEX_PROJECT!,
    location: env.GOOGLE_VERTEX_LOCATION!,
  };
};

export const serverRuntime = createServerRuntime({
  db,
  storageConfig,
  useMockAI: env.USE_MOCK_AI,
  aiProvider: env.AI_PROVIDER,
  geminiApiKey: env.GEMINI_API_KEY,
  vertexConfig: buildVertexConfig(),
});

export const sseManager = createSSEManager();

export const api = createApi({
  auth,
  serverRuntime,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});
