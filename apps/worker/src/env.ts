import { Schema } from 'effect';

const BooleanStringSchema = Schema.transform(Schema.String, Schema.Boolean, {
  decode: (s) => s === 'true' || s === '1',
  encode: (b) => (b ? 'true' : 'false'),
});

export const envSchema = Schema.Struct({
  SERVER_POSTGRES_URL: Schema.String,
  PUBLIC_SERVER_URL: Schema.optionalWith(Schema.String, {
    default: () => 'http://localhost:3036',
  }),

  GEMINI_API_KEY: Schema.optional(Schema.String.pipe(Schema.minLength(1))),

  USE_MOCK_AI: Schema.optionalWith(BooleanStringSchema, {
    default: () => true,
  }),
  DISABLE_DEEP_RESEARCH: Schema.optionalWith(BooleanStringSchema, {
    default: () => false,
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
  SSE_REDIS_CHANNEL_PREFIX: Schema.optionalWith(Schema.String, {
    default: () => 'cs:sse:user',
  }),
  QUEUE_NOTIFY_CHANNEL: Schema.optionalWith(Schema.String, {
    default: () => 'cs:queue:notify',
  }),

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
});

// Docker Compose sets `VAR: "${VAR:-}"` which resolves to "" when unset.
// Strip empty strings so Schema.optional treats them as missing.
const sanitizedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== ''),
);
const rawEnv = Schema.decodeUnknownSync(envSchema)(sanitizedEnv);

if (!rawEnv.USE_MOCK_AI && !rawEnv.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required when USE_MOCK_AI=false');
}

const proxyConfigured = Boolean(rawEnv.HTTPS_PROXY ?? rawEnv.HTTP_PROXY);
if (proxyConfigured && !rawEnv.NODE_EXTRA_CA_CERTS) {
  throw new Error(
    'NODE_EXTRA_CA_CERTS is required when HTTPS_PROXY or HTTP_PROXY is configured',
  );
}

if (
  process.env.NODE_ENV === 'production' &&
  new URL(rawEnv.PUBLIC_SERVER_URL).protocol !== 'https:'
) {
  throw new Error('PUBLIC_SERVER_URL must use https in production');
}

export const env = rawEnv;
