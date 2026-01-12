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

// Image Mocks
export {
  createMockImage,
  MockImageLive,
  MockImageWithLatency,
  DEFAULT_MOCK_IMAGE,
  type MockImageOptions,
} from './image';

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
import { MockImageLive, MockImageWithLatency } from './image';

// =============================================================================
// Combined Mock AI Layer
// =============================================================================

/**
 * Combined mock layer for all AI services (LLM + TTS + Image).
 * Use this in tests instead of importing individual mocks separately.
 * No delay for fast tests.
 */
export const MockAILive: Layer.Layer<AI> = Layer.mergeAll(
  MockLLMLive,
  MockTTSLive,
  MockImageLive,
);

/**
 * Combined mock layer with realistic latency for dev server.
 * - LLM: 10 second delay (script generation)
 * - TTS: 15 second delay (audio synthesis)
 * - Image: 5 second delay (image generation)
 */
export const MockAIWithLatency: Layer.Layer<AI> = Layer.mergeAll(
  MockLLMWithLatency,
  MockTTSWithLatency,
  MockImageWithLatency,
);
