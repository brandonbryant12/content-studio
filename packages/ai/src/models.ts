/**
 * Centralized active model defaults for the currently configured provider set.
 *
 * Provider-specific model catalogs live under `providers/`.
 */
export {
  LLM_MODEL,
  LLM_MODEL_IDS,
  TTS_MODEL,
  IMAGE_GEN_MODEL,
  DEEP_RESEARCH_MODEL,
} from './providers/google/models';

export type { GoogleLLMModelId as LLMModelId } from './providers/google/models';
