import { CurrentUserLive } from '@repo/auth-policy';
import { Layer } from 'effect';
import type { TestUser } from '../factories/user';
import type { LLM, TTS } from '@repo/ai';
import type { CurrentUser} from '@repo/auth-policy';
import type { Db } from '@repo/effect/db';
import type { Storage } from '@repo/storage';
import { MockLLMLive, createMockLLM, type MockLLMOptions } from '../mocks/llm';
import {
  MockStorageLive,
  createMockStorage,
  type MockStorageOptions,
} from '../mocks/storage';
import { MockTTSLive, createMockTTS, type MockTTSOptions } from '../mocks/tts';

/**
 * Options for creating test layers.
 */
export interface TestLayersOptions {
  llm?: MockLLMOptions;
  tts?: MockTTSOptions;
  storage?: MockStorageOptions;
}

/**
 * Create mock layers for all AI and storage services.
 * Use this when testing services that depend on LLM, TTS, and Storage.
 *
 * @example
 * ```ts
 * const layers = createMockAILayers();
 *
 * await Effect.runPromise(
 *   generator.generateScript(podcastId).pipe(
 *     Effect.provide(Layer.mergeAll(ctx.dbLayer, layers))
 *   )
 * );
 * ```
 */
export const createMockAILayers = (
  options: TestLayersOptions = {},
): Layer.Layer<LLM | TTS | Storage> => {
  const llm = options.llm ? createMockLLM(options.llm) : MockLLMLive;
  const tts = options.tts ? createMockTTS(options.tts) : MockTTSLive;
  const storage = options.storage
    ? createMockStorage(options.storage)
    : MockStorageLive;

  return Layer.mergeAll(llm, tts, storage);
};

/**
 * Create a CurrentUser layer for a test user.
 *
 * @example
 * ```ts
 * const user = createTestUser();
 * const userLayer = createTestUserLayer(user);
 *
 * await Effect.runPromise(
 *   service.createPodcast(data).pipe(
 *     Effect.provide(Layer.mergeAll(ctx.dbLayer, userLayer))
 *   )
 * );
 * ```
 */
export const createTestUserLayer = (
  user: TestUser,
): Layer.Layer<CurrentUser> => {
  return CurrentUserLive({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'user',
  });
};

/**
 * Create all layers needed for integration testing.
 * Combines database, mock AI services, and user context.
 *
 * @example
 * ```ts
 * const { layers, cleanup } = await createIntegrationTestLayers({
 *   user: createTestUser(),
 * });
 *
 * await Effect.runPromise(
 *   generator.generate(podcastId).pipe(Effect.provide(layers))
 * );
 *
 * await cleanup();
 * ```
 */
export const createIntegrationTestLayers = async (options: {
  user: TestUser;
  dbLayer: Layer.Layer<Db>;
  aiOptions?: TestLayersOptions;
}): Promise<{
  layers: Layer.Layer<LLM | TTS | Storage | CurrentUser | Db>;
  cleanup: () => Promise<void>;
}> => {
  const aiLayers = createMockAILayers(options.aiOptions);
  const userLayer = createTestUserLayer(options.user);

  return {
    layers: Layer.mergeAll(options.dbLayer, aiLayers, userLayer),
    cleanup: async () => {
      // No cleanup needed for mock layers
    },
  };
};
