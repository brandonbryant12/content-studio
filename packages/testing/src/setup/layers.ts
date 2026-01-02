import { withCurrentUser, Role, type User } from '@repo/auth/policy';
import { Effect, Layer } from 'effect';
import type { TestUser } from '../factories/user';
import type { LLM, TTS } from '@repo/ai';
import type { Db } from '@repo/db/effect';
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
 * Convert a TestUser to a User for policy context.
 * Export for use in router integration tests.
 */
export const toUser = (testUser: TestUser): User => ({
  id: testUser.id,
  email: testUser.email,
  name: testUser.name,
  role: testUser.role === 'admin' ? Role.ADMIN : Role.USER,
});

/**
 * Wrap an effect with test user context.
 * Uses FiberRef to scope user context for the duration of the effect.
 *
 * @example
 * ```ts
 * const user = createTestUser();
 *
 * await Effect.runPromise(
 *   withTestUser(user)(
 *     service.createPodcast(data).pipe(Effect.provide(ctx.dbLayer))
 *   )
 * );
 * ```
 */
export const withTestUser =
  (testUser: TestUser) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    withCurrentUser(toUser(testUser))(effect);

/**
 * Create all layers needed for integration testing.
 * Combines database and mock AI services.
 * Note: User context is now handled via `withTestUser` wrapper, not a layer.
 *
 * @example
 * ```ts
 * const { layers, cleanup } = await createIntegrationTestLayers({
 *   dbLayer: ctx.dbLayer,
 * });
 *
 * const user = createTestUser();
 * await Effect.runPromise(
 *   withTestUser(user)(
 *     generator.generate(podcastId).pipe(Effect.provide(layers))
 *   )
 * );
 *
 * await cleanup();
 * ```
 */
export const createIntegrationTestLayers = async (options: {
  dbLayer: Layer.Layer<Db>;
  aiOptions?: TestLayersOptions;
}): Promise<{
  layers: Layer.Layer<LLM | TTS | Storage | Db>;
  cleanup: () => Promise<void>;
}> => {
  const aiLayers = createMockAILayers(options.aiOptions);

  return {
    layers: Layer.mergeAll(options.dbLayer, aiLayers),
    cleanup: async () => {
      // No cleanup needed for mock layers
    },
  };
};
