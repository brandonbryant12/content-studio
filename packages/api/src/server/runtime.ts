import { ManagedRuntime, Layer, Logger } from 'effect';
import { DbLive, type Db } from '@repo/db/effect';
import { QueueLive, type Queue } from '@repo/queue';
import { GoogleLive, type LLM } from '@repo/ai/llm';
import { GoogleTTSLive, type TTS } from '@repo/ai/tts';
import { MockLLMLive, MockTTSLive } from '@repo/testing';
import { DatabasePolicyLive, type Policy } from '@repo/auth/policy';
import {
  DocumentsLive,
  PodcastRepoLive,
  ScriptVersionRepoLive,
  type Documents,
  type PodcastRepo,
  type ScriptVersionRepo,
} from '@repo/media';
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
export type SharedServices =
  | Db
  | Policy
  | Storage
  | Queue
  | TTS
  | LLM
  | Documents
  | PodcastRepo
  | ScriptVersionRepo;

/**
 * Configuration for creating the server runtime.
 */
export interface ServerRuntimeConfig {
  db: DatabaseInstance;
  geminiApiKey: string;
  storageConfig: StorageConfig;
  useMockAI?: boolean;
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
 * - TTS: Text-to-speech service (standalone)
 * - LLM: Language model service (standalone)
 * - Documents: Document service (depends on Db, Storage)
 * - PodcastRepo: Podcast repository (depends on Db)
 * - ScriptVersionRepo: Script version repository (depends on Db)
 */
export const createSharedLayers = (
  config: ServerRuntimeConfig,
): Layer.Layer<SharedServices, never, never> => {
  const dbLayer = DbLive(config.db);
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const storageLayer = createStorageLayer(config.storageConfig, dbLayer);

  // Use mock AI layers for testing, real Google layers for production
  const ttsLayer = config.useMockAI
    ? MockTTSLive
    : GoogleTTSLive({ apiKey: config.geminiApiKey });
  const llmLayer = config.useMockAI
    ? MockLLMLive
    : GoogleLive({ apiKey: config.geminiApiKey });

  // Documents no longer needs CurrentUser in layer composition
  // User context is obtained via FiberRef at runtime
  const documentsLayer = DocumentsLive.pipe(
    Layer.provide(Layer.mergeAll(dbLayer, storageLayer)),
  );

  // Podcast repos only need DB access
  const podcastRepoLayer = PodcastRepoLive.pipe(Layer.provide(dbLayer));
  const scriptVersionRepoLayer = ScriptVersionRepoLive.pipe(
    Layer.provide(dbLayer),
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
    ttsLayer,
    llmLayer,
    documentsLayer,
    podcastRepoLayer,
    scriptVersionRepoLayer,
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
