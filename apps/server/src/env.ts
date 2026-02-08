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

// Boolean string schema
const BooleanStringSchema = Schema.transform(Schema.String, Schema.Boolean, {
  decode: (s) => s === 'true' || s === '1',
  encode: (b) => (b ? 'true' : 'false'),
});

// Storage provider schema
const StorageProviderSchema = Schema.Union(
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

  // AI Provider selection: 'gemini' (default) or 'vertex'
  AI_PROVIDER: Schema.optionalWith(Schema.Literal('gemini', 'vertex'), {
    default: () => 'gemini' as const,
  }),

  // Google Gemini API key (required when AI_PROVIDER=gemini)
  GEMINI_API_KEY: Schema.optional(Schema.String.pipe(Schema.minLength(1))),

  // Vertex AI configuration (required when AI_PROVIDER=vertex)
  // Express mode: only GOOGLE_VERTEX_API_KEY needed
  // Service account mode: GOOGLE_VERTEX_PROJECT + GOOGLE_VERTEX_LOCATION + GOOGLE_APPLICATION_CREDENTIALS
  GOOGLE_VERTEX_PROJECT: Schema.optional(
    Schema.String.pipe(Schema.minLength(1)),
  ),
  GOOGLE_VERTEX_LOCATION: Schema.optional(
    Schema.String.pipe(Schema.minLength(1)),
  ),
  GOOGLE_VERTEX_API_KEY: Schema.optional(
    Schema.String.pipe(Schema.minLength(1)),
  ),
  GOOGLE_APPLICATION_CREDENTIALS: Schema.optional(
    Schema.String.pipe(Schema.minLength(1)),
  ),

  // Use mock AI services in development (set to false to use real AI)
  USE_MOCK_AI: Schema.optionalWith(BooleanStringSchema, {
    default: () => process.env.NODE_ENV !== 'production',
  }),

  // Storage configuration
  STORAGE_PROVIDER: Schema.optionalWith(StorageProviderSchema, {
    default: () => 'filesystem' as const,
  }),
  STORAGE_PATH: Schema.optional(Schema.String), // For filesystem provider
  STORAGE_BASE_URL: Schema.optional(Schema.String), // For filesystem provider
  S3_BUCKET: Schema.optional(Schema.String), // For S3 provider
  S3_REGION: Schema.optional(Schema.String), // For S3 provider
  S3_ACCESS_KEY_ID: Schema.optional(Schema.String), // For S3 provider
  S3_SECRET_ACCESS_KEY: Schema.optional(Schema.String), // For S3 provider
  S3_ENDPOINT: Schema.optional(Schema.String), // For S3 provider

  // Proxy configuration (for corporate environments)
  HTTPS_PROXY: Schema.optional(Schema.String),
  HTTP_PROXY: Schema.optional(Schema.String),
  NO_PROXY: Schema.optional(Schema.String), // Comma-separated list of hosts to bypass proxy
});

const rawEnv = Schema.decodeUnknownSync(envSchema)(process.env);

// Validate AI provider configuration
if (!rawEnv.USE_MOCK_AI) {
  if (rawEnv.AI_PROVIDER === 'gemini') {
    if (!rawEnv.GEMINI_API_KEY) {
      throw new Error(
        'GEMINI_API_KEY is required when AI_PROVIDER=gemini (or not set)',
      );
    }
  } else if (rawEnv.AI_PROVIDER === 'vertex') {
    // Vertex AI can use either Express mode (API key) or Service Account mode
    const hasExpressMode = !!rawEnv.GOOGLE_VERTEX_API_KEY;
    const hasServiceAccountMode =
      !!rawEnv.GOOGLE_VERTEX_PROJECT && !!rawEnv.GOOGLE_VERTEX_LOCATION;

    if (!hasExpressMode && !hasServiceAccountMode) {
      throw new Error(
        'Vertex AI requires either GOOGLE_VERTEX_API_KEY (express mode) or ' +
          'GOOGLE_VERTEX_PROJECT + GOOGLE_VERTEX_LOCATION (service account mode)',
      );
    }
  }
}

export const env = rawEnv;
