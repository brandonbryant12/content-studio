import { Effect } from 'effect';
import type { VoiceGender, VoiceInfo } from '../voices';
import { TTS } from '../service';

// =============================================================================
// Types
// =============================================================================

export interface ListVoicesInput {
  readonly gender?: VoiceGender;
}

export interface ListVoicesResult {
  readonly voices: readonly VoiceInfo[];
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * List available TTS voices with optional gender filter.
 */
export const listVoices = (input: ListVoicesInput) =>
  TTS.pipe(
    Effect.flatMap((tts) => tts.listVoices({ gender: input.gender })),
    Effect.map((voices) => ({ voices })),
    Effect.withSpan('useCase.listVoices', {
      attributes: { 'filter.gender': input.gender },
    }),
  );
