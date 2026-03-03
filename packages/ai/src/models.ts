/**
 * Centralized model ID constants for all AI providers.
 *
 * Update these when switching model versions — all providers
 * reference this file instead of hardcoding model strings.
 */

/** Structured object generation (generateObject). Latest Gemini Flash text model. */
export const LLM_MODEL = 'gemini-3-flash-preview';

/** Text-to-speech synthesis. */
export const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

/** Image generation from text prompts. */
export const IMAGE_GEN_MODEL = 'gemini-3.1-flash-image-preview';

/** Deep research agent (Google interactions API). */
export const DEEP_RESEARCH_MODEL = 'deep-research-pro-preview-12-2025';
