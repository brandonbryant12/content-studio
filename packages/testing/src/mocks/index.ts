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

// =============================================================================
// Combined Mock AI Layer
// =============================================================================

/**
 * Combined mock layer for all AI services (LLM + TTS).
 * Use this in tests instead of importing MockLLMLive and MockTTSLive separately.
 * No delay for fast tests.
 */
export const MockAILive: Layer.Layer<AI> = Layer.mergeAll(
  MockLLMLive,
  MockTTSLive,
);

/**
 * Combined mock layer with realistic latency for dev server.
 * - LLM: 10 second delay (script generation)
 * - TTS: 15 second delay (audio synthesis)
 */
export const MockAIWithLatency: Layer.Layer<AI> = Layer.mergeAll(
  MockLLMWithLatency,
  MockTTSWithLatency,
);
