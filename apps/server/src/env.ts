import { Schema } from 'effect';
import { DEFAULT_SERVER_PORT } from './constants';

const DEFAULT_SERVER_HOST = 'localhost';

const PortSchema = Schema.transform(
  Schema.String,
  Schema.Number.pipe(Schema.int(), Schema.between(0, 65535)),
  {
    decode: (s) => parseInt(s, 10),
    encode: (n) => String(n),
  },
);

const PositiveIntSchema = Schema.transform(
  Schema.String,
  Schema.Number.pipe(
    Schema.int(),
    Schema.filter((value) => value > 0, {
      message: () => 'Must be a positive integer',
    }),
  ),
  {
    decode: (s) => parseInt(s, 10),
    encode: (n) => String(n),
  },
);

const PathStartingWithSlash = Schema.String.pipe(
  Schema.filter((input): input is `/${string}` => input.startsWith('/'), {
    message: () => 'API Path must start with "/" if provided.',
  }),
);

const UrlSchema = Schema.String.pipe(
  Schema.filter(
    (s) => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    },
    { message: () => 'Invalid URL' },
  ),
);

const BooleanStringSchema = Schema.transform(Schema.String, Schema.Boolean, {
  decode: (s) => s === 'true' || s === '1',
  encode: (b) => (b ? 'true' : 'false'),
});

const AuthModeSchema = Schema.Union(
  Schema.Literal('dev-password'),
  Schema.Literal('sso-only'),
);

const CsvStringArraySchema = Schema.transform(
  Schema.String,
  Schema.Array(Schema.String),
  {
    decode: (input) =>
      input
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    encode: (parts) => parts.join(','),
  },
);

export const envSchema = Schema.Struct({
  SERVER_PORT: Schema.optionalWith(PortSchema, {
    default: () => DEFAULT_SERVER_PORT,
  }),
  SERVER_HOST: Schema.optionalWith(Schema.String.pipe(Schema.minLength(1)), {
    default: () => DEFAULT_SERVER_HOST,
  }),
  SERVER_AUTH_SECRET: Schema.String.pipe(Schema.minLength(1)),
  AUTH_MODE: Schema.optionalWith(AuthModeSchema, {
    default: () => 'dev-password' as const,
  }),
  AUTH_MICROSOFT_CLIENT_ID: Schema.optional(
    Schema.String.pipe(Schema.minLength(1)),
  ),
  AUTH_MICROSOFT_CLIENT_SECRET: Schema.optional(
    Schema.String.pipe(Schema.minLength(1)),
  ),
  AUTH_MICROSOFT_TENANT_ID: Schema.optional(
    Schema.String.pipe(Schema.minLength(1)),
  ),
  AUTH_ROLE_ADMIN_GROUP_IDS: Schema.optionalWith(CsvStringArraySchema, {
    default: () => [],
  }),
  AUTH_ROLE_USER_GROUP_IDS: Schema.optionalWith(CsvStringArraySchema, {
    default: () => [],
  }),
  SERVER_POSTGRES_URL: Schema.String,
  SERVER_RUN_DB_MIGRATIONS_ON_STARTUP: Schema.optionalWith(
    BooleanStringSchema,
    {
      default: () => false,
    },
  ),

  PUBLIC_SERVER_URL: UrlSchema,
  PUBLIC_SERVER_API_PATH: Schema.optionalWith(PathStartingWithSlash, {
    default: () => '/api' as `/${string}`,
  }),
  PUBLIC_WEB_URL: UrlSchema,

  GEMINI_API_KEY: Schema.optional(Schema.String.pipe(Schema.minLength(1))),

  USE_MOCK_AI: Schema.optionalWith(BooleanStringSchema, {
    default: () => true,
  }),

  S3_BUCKET: Schema.optional(Schema.String),
  S3_REGION: Schema.optional(Schema.String),
  S3_ACCESS_KEY_ID: Schema.optional(Schema.String),
  S3_SECRET_ACCESS_KEY: Schema.optional(Schema.String),
  S3_ENDPOINT: Schema.optional(Schema.String),
  S3_PUBLIC_ENDPOINT: Schema.optional(Schema.String),

  SERVER_REDIS_URL: Schema.optionalWith(Schema.String, {
    default: () => 'redis://localhost:6379',
  }),
  TRUST_PROXY: Schema.optionalWith(BooleanStringSchema, {
    default: () => false,
  }),
  SSE_REDIS_CHANNEL_PREFIX: Schema.optionalWith(Schema.String, {
    default: () => 'cs:sse:user',
  }),
  QUEUE_NOTIFY_CHANNEL: Schema.optionalWith(Schema.String, {
    default: () => 'cs:queue:notify',
  }),

  CORS_ORIGINS: Schema.optionalWith(Schema.String, {
    default: () => '*',
  }),
  AUTH_RATE_LIMIT_MAX: Schema.optional(PositiveIntSchema),
  AUTH_RATE_LIMIT_WINDOW_MS: Schema.optional(PositiveIntSchema),
  AUDIO_PLAYBACK_PROXY_ENABLED: Schema.optionalWith(BooleanStringSchema, {
    default: () => true,
  }),
  STORAGE_ACCESS_PROXY_ENABLED: Schema.optionalWith(BooleanStringSchema, {
    default: () => true,
  }),
  AUDIO_PLAYBACK_SIGNING_SECRET: Schema.optional(
    Schema.String.pipe(Schema.minLength(32)),
  ),
  AUDIO_PLAYBACK_URL_TTL_SECONDS: Schema.optional(PositiveIntSchema),

  TELEMETRY_ENABLED: Schema.optionalWith(BooleanStringSchema, {
    default: () => process.env.NODE_ENV === 'production',
  }),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Schema.optional(Schema.String),
  OTEL_EXPORTER_OTLP_HEADERS: Schema.optional(Schema.String),
  OTEL_SERVICE_NAME: Schema.optional(Schema.String),
  OTEL_SERVICE_VERSION: Schema.optional(Schema.String),
  OTEL_ENV: Schema.optionalWith(Schema.String, {
    default: () => process.env.NODE_ENV ?? 'development',
  }),

  HTTPS_PROXY: Schema.optional(Schema.String),
  HTTP_PROXY: Schema.optional(Schema.String),
  NO_PROXY: Schema.optional(Schema.String),
  NODE_EXTRA_CA_CERTS: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  EXPOSE_DEEP_HEALTHCHECK: Schema.optionalWith(BooleanStringSchema, {
    default: () => process.env.NODE_ENV !== 'production',
  }),
});

// Docker Compose sets `VAR: "${VAR:-}"` which resolves to "" when unset.
// Strip empty strings so Schema.optional treats them as missing.
const sanitizedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== ''),
);
const rawEnv = Schema.decodeUnknownSync(envSchema)(sanitizedEnv);

if (!rawEnv.USE_MOCK_AI) {
  if (!rawEnv.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required when USE_MOCK_AI=false');
  }
}

if (rawEnv.AUTH_MODE !== 'dev-password') {
  if (
    !rawEnv.AUTH_MICROSOFT_CLIENT_ID ||
    !rawEnv.AUTH_MICROSOFT_CLIENT_SECRET ||
    !rawEnv.AUTH_MICROSOFT_TENANT_ID
  ) {
    throw new Error(
      'AUTH_MICROSOFT_CLIENT_ID, AUTH_MICROSOFT_CLIENT_SECRET, and AUTH_MICROSOFT_TENANT_ID are required when AUTH_MODE is sso-only',
    );
  }

  if (
    rawEnv.AUTH_ROLE_ADMIN_GROUP_IDS.length === 0 ||
    rawEnv.AUTH_ROLE_USER_GROUP_IDS.length === 0
  ) {
    throw new Error(
      'AUTH_ROLE_ADMIN_GROUP_IDS and AUTH_ROLE_USER_GROUP_IDS must be configured when AUTH_MODE is sso-only',
    );
  }
}

const proxyConfigured = Boolean(rawEnv.HTTPS_PROXY ?? rawEnv.HTTP_PROXY);
if (proxyConfigured && !rawEnv.NODE_EXTRA_CA_CERTS) {
  throw new Error(
    'NODE_EXTRA_CA_CERTS is required when HTTPS_PROXY or HTTP_PROXY is configured',
  );
}

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  if (rawEnv.AUTH_MODE === 'dev-password') {
    throw new Error('AUTH_MODE=dev-password is not allowed in production');
  }

  if (new URL(rawEnv.PUBLIC_SERVER_URL).protocol !== 'https:') {
    throw new Error('PUBLIC_SERVER_URL must use https in production');
  }

  if (new URL(rawEnv.PUBLIC_WEB_URL).protocol !== 'https:') {
    throw new Error('PUBLIC_WEB_URL must use https in production');
  }

  if (!rawEnv.TRUST_PROXY) {
    throw new Error('TRUST_PROXY must be true in production behind ingress');
  }

  if (
    (rawEnv.AUDIO_PLAYBACK_PROXY_ENABLED ||
      rawEnv.STORAGE_ACCESS_PROXY_ENABLED) &&
    !rawEnv.AUDIO_PLAYBACK_SIGNING_SECRET
  ) {
    throw new Error(
      'AUDIO_PLAYBACK_SIGNING_SECRET is required in production when AUDIO_PLAYBACK_PROXY_ENABLED=true or STORAGE_ACCESS_PROXY_ENABLED=true',
    );
  }
}

const authRateLimitMax =
  rawEnv.AUTH_RATE_LIMIT_MAX ?? (isProduction ? 120 : 1000);
const authRateLimitWindowMs =
  rawEnv.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000;
const audioPlaybackUrlTtlSeconds = rawEnv.AUDIO_PLAYBACK_URL_TTL_SECONDS ?? 900;
const audioPlaybackSigningSecret =
  rawEnv.AUDIO_PLAYBACK_SIGNING_SECRET ?? rawEnv.SERVER_AUTH_SECRET;

export const env = {
  ...rawEnv,
  AUTH_RATE_LIMIT_MAX: authRateLimitMax,
  AUTH_RATE_LIMIT_WINDOW_MS: authRateLimitWindowMs,
  AUDIO_PLAYBACK_URL_TTL_SECONDS: audioPlaybackUrlTtlSeconds,
  AUDIO_PLAYBACK_SIGNING_SECRET: audioPlaybackSigningSecret,
};
