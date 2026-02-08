import { Layer } from 'effect';
import type { AI } from '@repo/ai';

// LLM Mocks
export {
  createMockLLM,
  MockLLMLive,
  MockLLMWithLatency,
  DEFAULT_MOCK_SCRIPT,
  type MockLLMOptions,
} from './llm';

// TTS Mocks
export {
  createMockTTS,
  MockTTSLive,
  MockTTSWithLatency,
  MOCK_VOICES,
  type MockTTSOptions,
} from './tts';

// ImageGen Mocks
export {
  createMockImageGen,
  MockImageGenLive,
  MockImageGenWithLatency,
  type MockImageGenOptions,
} from './image-gen';

// Storage Mocks
export {
  createMockStorage,
  createInMemoryStorage,
  MockStorageLive,
  type MockStorageOptions,
} from './storage';

// Import for combined layer
import { MockLLMLive, MockLLMWithLatency } from './llm';
import { MockTTSLive, MockTTSWithLatency } from './tts';
import { MockImageGenLive, MockImageGenWithLatency } from './image-gen';

// =============================================================================
// Combined Mock AI Layer
// =============================================================================

/**
 * Combined mock layer for all AI services (LLM + TTS + ImageGen).
 * Use this in tests instead of importing each mock separately.
 * No delay for fast tests.
 */
export const MockAILive: Layer.Layer<AI> = Layer.mergeAll(
  MockLLMLive,
  MockTTSLive,
  MockImageGenLive,
);

/**
 * Combined mock layer with realistic latency for dev server.
 * - LLM: 10 second delay (script generation)
 * - TTS: 15 second delay (audio synthesis)
 * - ImageGen: 8 second delay (image generation)
 */
export const MockAIWithLatency: Layer.Layer<AI> = Layer.mergeAll(
  MockLLMWithLatency,
  MockTTSWithLatency,
  MockImageGenWithLatency,
);
