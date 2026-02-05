import { ManagedRuntime, Layer, Logger } from 'effect';
import { DbLive, type Db } from '@repo/db/effect';
import { QueueLive, type Queue } from '@repo/queue';
import {
  type AI,
  type AIProvider,
  type VertexAIConfig,
  LLMGoogleLive,
  LLMVertexLive,
} from '@repo/ai';
import { MockAIWithLatency, MockTTSWithLatency } from '@repo/testing';
import { DatabasePolicyLive, type Policy } from '@repo/auth/policy';
import { MediaLive, type Media } from '@repo/media';
import type { Storage } from '@repo/storage';
import type { DatabaseInstance } from '@repo/db/client';
import { createStorageLayer } from './storage-factory';
import type { StorageConfig } from './orpc';

/**
 * All services that can be shared across requests.
 * These are built once at server startup and reused for all requests.
 *
 * Note: CurrentUser is NOT included here - it's obtained via FiberRef
 * at runtime using withCurrentUser().
 */
export type SharedServices = Db | Policy | Storage | Queue | AI | Media;

/**
 * Configuration for creating the server runtime.
 */
export interface ServerRuntimeConfig {
  db: DatabaseInstance;
  storageConfig: StorageConfig;
  useMockAI?: boolean;
  /** AI provider to use: 'gemini' or 'vertex' */
  aiProvider: AIProvider;
  /** Gemini API key (required when aiProvider='gemini') */
  geminiApiKey?: string;
  /** Vertex AI config (required when aiProvider='vertex') */
  vertexConfig?: VertexAIConfig;
}

/**
 * Creates the shared layer graph for all services.
 * This is built once at server startup.
 *
 * The layer graph:
 * - Db: Database connection
 * - Policy: Authorization service (depends on Db)
 * - Queue: Job queue service (depends on Db)
 * - Storage: File storage (S3, filesystem, or database-backed)
 * - AI: LLM + TTS services (standalone)
 * - Media: Documents, PodcastRepo, CollaboratorRepo (depends on Db, Storage)
 */
export const createSharedLayers = (
  config: ServerRuntimeConfig,
): Layer.Layer<SharedServices, never, never> => {
  const dbLayer = DbLive(config.db);
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const storageLayer = createStorageLayer(config.storageConfig, dbLayer);

  // AI layer bundles LLM and TTS
  // Mock AI has realistic latency (10s LLM, 15s TTS) for dev testing
  // TTS is always mocked for now (real TTS not yet available)
  const aiLayer = config.useMockAI
    ? MockAIWithLatency
    : Layer.mergeAll(
        config.aiProvider === 'vertex'
          ? LLMVertexLive(config.vertexConfig!)
          : LLMGoogleLive({ apiKey: config.geminiApiKey! }),
        MockTTSWithLatency,
      );

  // Media layer bundles Documents, PodcastRepo, and CollaboratorRepo
  const mediaLayer = MediaLive.pipe(
    Layer.provide(Layer.mergeAll(dbLayer, storageLayer)),
  );

  const loggerLayer = Logger.pretty;

  if (config.useMockAI) {
    console.log('[API] Using mock AI layers for testing');
  }

  return Layer.mergeAll(
    dbLayer,
    policyLayer,
    queueLayer,
    storageLayer,
    aiLayer,
    mediaLayer,
    loggerLayer,
  );
};

/**
 * Type alias for the server runtime.
 */
export type ServerRuntime = ManagedRuntime.ManagedRuntime<
  SharedServices,
  never
>;

/**
 * Creates a shared ManagedRuntime for the server.
 * This should be created once at server startup and reused for all requests.
 *
 * The runtime provides all shared services. For request-specific context
 * (like the current user), use withCurrentUser() to scope the user
 * via FiberRef before running effects.
 *
 * @example
 * ```typescript
 * // At server startup
 * const runtime = createServerRuntime({
 *   db,
 *   geminiApiKey: env.GEMINI_API_KEY,
 *   storageConfig,
 *   useMockAI: env.USE_MOCK_AI,
 * });
 *
 * // In request handler
 * const result = await runtime.runPromise(
 *   withCurrentUser(sessionUser)(myEffect)
 * );
 * ```
 */
export const createServerRuntime = (
  config: ServerRuntimeConfig,
): ServerRuntime => {
  const layers = createSharedLayers(config);
  return ManagedRuntime.make(layers);
};
