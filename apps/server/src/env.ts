import * as v from 'valibot';

const DEFAULT_SERVER_PORT = 3035;
const DEFAULT_SERVER_HOST = 'localhost';

const createPortSchema = ({ defaultPort }: { defaultPort: number }) =>
  v.pipe(
    v.optional(v.string(), `${defaultPort}`),
    v.transform((s) => parseInt(s, 10)),
    v.integer(),
    v.minValue(0),
    v.maxValue(65535),
  );

export const envSchema = v.object({
  SERVER_PORT: createPortSchema({ defaultPort: DEFAULT_SERVER_PORT }),
  SERVER_HOST: v.pipe(
    v.optional(v.string(), DEFAULT_SERVER_HOST),
    v.minLength(1),
  ),
  SERVER_AUTH_SECRET: v.pipe(v.string(), v.minLength(1)),
  SERVER_POSTGRES_URL: v.string(),

  // Backend URL, used to configure OpenAPI (Scalar)
  PUBLIC_SERVER_URL: v.pipe(v.string(), v.url()),
  PUBLIC_SERVER_API_PATH: v.optional(
    v.custom<`/${string}`>(
      (input) => typeof input === 'string' && input.startsWith('/'),
      'API Path must start with "/" if provided.',
    ),
    '/api',
  ),

  // Frontend URL, used to configure trusted origin (CORS)
  PUBLIC_WEB_URL: v.pipe(v.string(), v.url()),

  // Google AI API key for LLM and TTS
  GEMINI_API_KEY: v.pipe(v.string(), v.minLength(1)),

  // Storage configuration
  STORAGE_PROVIDER: v.optional(
    v.picklist(['database', 'filesystem', 's3']),
    'database',
  ),
  STORAGE_PATH: v.optional(v.string()), // For filesystem provider
  STORAGE_BASE_URL: v.optional(v.string()), // For filesystem provider (e.g., http://localhost:3035/storage)
  S3_BUCKET: v.optional(v.string()), // For S3 provider
  S3_REGION: v.optional(v.string()), // For S3 provider
  S3_ACCESS_KEY_ID: v.optional(v.string()), // For S3 provider
  S3_SECRET_ACCESS_KEY: v.optional(v.string()), // For S3 provider
  S3_ENDPOINT: v.optional(v.string()), // For S3 provider (optional, for S3-compatible services)
});

export const env = v.parse(envSchema, process.env);
