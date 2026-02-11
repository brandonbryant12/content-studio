import { withCurrentUser, Role, type User } from '@repo/auth/policy';
import { Layer } from 'effect';
import type { TestUser } from '../factories/user';
import type { LLM, TTS } from '@repo/ai';
import type { Storage } from '@repo/storage';
import type { Effect } from 'effect';
import { MockLLMLive, createMockLLM, type MockLLMOptions } from '../mocks/llm';
import {
  MockStorageLive,
  createMockStorage,
  type MockStorageOptions,
} from '../mocks/storage';
import { MockTTSLive, createMockTTS, type MockTTSOptions } from '../mocks/tts';

export interface TestLayersOptions {
  llm?: MockLLMOptions;
  tts?: MockTTSOptions;
  storage?: MockStorageOptions;
}

/**
 * Create mock layers for all AI and storage services.
 * Use this when testing services that depend on LLM, TTS, and Storage.
 */
export function createMockAILayers(
  options: TestLayersOptions = {},
): Layer.Layer<LLM | TTS | Storage> {
  const llm = options.llm ? createMockLLM(options.llm) : MockLLMLive;
  const tts = options.tts ? createMockTTS(options.tts) : MockTTSLive;
  const storage = options.storage
    ? createMockStorage(options.storage)
    : MockStorageLive;

  return Layer.mergeAll(llm, tts, storage);
}

/** Convert a TestUser to a User for policy context. */
export function toUser(testUser: TestUser): User {
  return {
    id: testUser.id,
    email: testUser.email,
    name: testUser.name,
    role: testUser.role === 'admin' ? Role.ADMIN : Role.USER,
  };
}

/**
 * Wrap an effect with test user context.
 * Uses FiberRef to scope user context for the duration of the effect.
 */
export const withTestUser =
  (testUser: TestUser) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    withCurrentUser(toUser(testUser))(effect);
