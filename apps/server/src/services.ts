import {
  configureSSEPublisher,
  createApi,
  createServerRuntime,
} from '@repo/api/server';
import { AuthMode, createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import { configureQueueNotifier } from '@repo/queue';
import { createAudioPlaybackProxy } from './audio-playback-proxy';
import { buildAuthTrustedOrigins } from './auth-trusted-origins';
import { buildStorageConfig } from './config';
import { env } from './env';

export const storageConfig = buildStorageConfig();
export const audioPlaybackProxy = createAudioPlaybackProxy({
  enabled: env.AUDIO_PLAYBACK_PROXY_ENABLED,
  signingSecret: env.AUDIO_PLAYBACK_SIGNING_SECRET,
  ttlSeconds: env.AUDIO_PLAYBACK_URL_TTL_SECONDS,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  storageConfig,
});

export const db = createDb({
  databaseUrl: env.SERVER_POSTGRES_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const microsoftSSOConfig =
  env.AUTH_MODE === AuthMode.DEV_PASSWORD
    ? undefined
    : {
        // Validated in env.ts when AUTH_MODE is hybrid/sso-only.
        clientId: env.AUTH_MICROSOFT_CLIENT_ID!,
        clientSecret: env.AUTH_MICROSOFT_CLIENT_SECRET!,
        tenantId: env.AUTH_MICROSOFT_TENANT_ID!,
        roleGroups: {
          adminGroupIds: env.AUTH_ROLE_ADMIN_GROUP_IDS,
          userGroupIds: env.AUTH_ROLE_USER_GROUP_IDS,
        },
      };

export const auth = createAuth({
  webUrl: env.PUBLIC_WEB_URL,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  authSecret: env.SERVER_AUTH_SECRET,
  authMode: env.AUTH_MODE,
  trustedOrigins: buildAuthTrustedOrigins({
    publicWebUrl: env.PUBLIC_WEB_URL,
    corsOrigins: env.CORS_ORIGINS,
    nodeEnv: process.env.NODE_ENV,
  }),
  microsoftSSO: microsoftSSOConfig,
  db,
});

configureSSEPublisher({
  redisUrl: env.SERVER_REDIS_URL,
  channelPrefix: env.SSE_REDIS_CHANNEL_PREFIX,
});

configureQueueNotifier({
  redisUrl: env.SERVER_REDIS_URL,
  channel: env.QUEUE_NOTIFY_CHANNEL,
});

export const serverRuntime = createServerRuntime({
  db,
  storageConfig,
  useMockAI: env.USE_MOCK_AI,
  geminiApiKey: env.GEMINI_API_KEY,
  telemetryConfig: {
    enabled: env.TELEMETRY_ENABLED,
    serviceName: env.OTEL_SERVICE_NAME ?? 'content-studio-server',
    serviceVersion: env.OTEL_SERVICE_VERSION,
    environment: env.OTEL_ENV,
    otlpTracesEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    otlpHeaders: env.OTEL_EXPORTER_OTLP_HEADERS,
  },
});

export const api = createApi({
  auth,
  serverRuntime,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});
