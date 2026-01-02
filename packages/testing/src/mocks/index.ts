import { Layer } from 'effect';
import type { AI } from '@repo/ai';

// LLM Mocks
export {
  createMockLLM,
  MockLLMLive,
  DEFAULT_MOCK_SCRIPT,
  type MockLLMOptions,
} from './llm';

// TTS Mocks
export {
  createMockTTS,
  MockTTSLive,
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
import { MockLLMLive } from './llm';
import { MockTTSLive } from './tts';

// =============================================================================
// Combined Mock AI Layer
// =============================================================================

/**
 * Combined mock layer for all AI services (LLM + TTS).
 * Use this in tests instead of importing MockLLMLive and MockTTSLive separately.
 */
export const MockAILive: Layer.Layer<AI> = Layer.mergeAll(
  MockLLMLive,
  MockTTSLive,
);
