import { Schema } from 'effect';
import { DEFAULT_SERVER_PORT } from './constants';

const DEFAULT_SERVER_HOST = 'localhost';

// Port schema that transforms string to number with validation
const PortSchema = Schema.transform(
  Schema.String,
  Schema.Number.pipe(Schema.int(), Schema.between(0, 65535)),
  {
    decode: (s) => parseInt(s, 10),
    encode: (n) => String(n),
  },
);

// Custom schema for path that starts with /
const PathStartingWithSlash = Schema.String.pipe(
  Schema.filter((input): input is `/${string}` => input.startsWith('/'), {
    message: () => 'API Path must start with "/" if provided.',
  }),
);

// URL validator schema
const UrlSchema = Schema.String.pipe(
  Schema.filter((s) => {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  }, { message: () => 'Invalid URL' }),
);

// Boolean string schema
const BooleanStringSchema = Schema.transform(
  Schema.String,
  Schema.Boolean,
  {
    decode: (s) => s === 'true' || s === '1',
    encode: (b) => (b ? 'true' : 'false'),
  },
);

// Storage provider schema
const StorageProviderSchema = Schema.Union(
  Schema.Literal('database'),
  Schema.Literal('filesystem'),
  Schema.Literal('s3'),
);

export const envSchema = Schema.Struct({
  SERVER_PORT: Schema.optionalWith(PortSchema, {
    default: () => DEFAULT_SERVER_PORT,
  }),
  SERVER_HOST: Schema.optionalWith(Schema.String.pipe(Schema.minLength(1)), {
    default: () => DEFAULT_SERVER_HOST,
  }),
  SERVER_AUTH_SECRET: Schema.String.pipe(Schema.minLength(1)),
  SERVER_POSTGRES_URL: Schema.String,

  // Backend URL, used to configure OpenAPI (Scalar)
  PUBLIC_SERVER_URL: UrlSchema,
  PUBLIC_SERVER_API_PATH: Schema.optionalWith(PathStartingWithSlash, {
    default: () => '/api' as `/${string}`,
  }),

  // Frontend URL, used to configure trusted origin (CORS)
  PUBLIC_WEB_URL: UrlSchema,

  // Google AI API key for LLM and TTS
  GEMINI_API_KEY: Schema.String.pipe(Schema.minLength(1)),

  // Use mock AI services (for testing)
  USE_MOCK_AI: Schema.optionalWith(BooleanStringSchema, {
    default: () => false,
  }),

  // Storage configuration
  STORAGE_PROVIDER: Schema.optionalWith(StorageProviderSchema, {
    default: () => 'database' as const,
  }),
  STORAGE_PATH: Schema.optional(Schema.String), // For filesystem provider
  STORAGE_BASE_URL: Schema.optional(Schema.String), // For filesystem provider
  S3_BUCKET: Schema.optional(Schema.String), // For S3 provider
  S3_REGION: Schema.optional(Schema.String), // For S3 provider
  S3_ACCESS_KEY_ID: Schema.optional(Schema.String), // For S3 provider
  S3_SECRET_ACCESS_KEY: Schema.optional(Schema.String), // For S3 provider
  S3_ENDPOINT: Schema.optional(Schema.String), // For S3 provider

  // ElectricSQL sync service URL
  ELECTRIC_URL: Schema.optionalWith(Schema.String, {
    default: () => 'http://localhost:3001',
  }),
});

export const env = Schema.decodeUnknownSync(envSchema)(process.env);
