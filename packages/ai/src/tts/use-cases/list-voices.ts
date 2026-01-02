import { Effect } from 'effect';
import { TTS, type VoiceInfo, type VoiceGender } from '../index';

// =============================================================================
// Types
// =============================================================================

export interface ListVoicesInput {
  readonly gender?: VoiceGender;
}

export interface ListVoicesResult {
  readonly voices: readonly VoiceInfo[];
}

// No errors - listVoices is always successful (in-memory voice list)
export type ListVoicesError = never;

// =============================================================================
// Use Case
// =============================================================================

/**
 * List available TTS voices with optional gender filter.
 *
 * This use case returns the list of available voices from the TTS service.
 * The voice data is in-memory so this operation cannot fail.
 *
 * @example
 * // List all voices
 * const result = yield* listVoices({});
 *
 * // List only female voices
 * const result = yield* listVoices({ gender: 'female' });
 */
export const listVoices = (
  input: ListVoicesInput,
): Effect.Effect<ListVoicesResult, ListVoicesError, TTS> =>
  Effect.gen(function* () {
    const tts = yield* TTS;
    const voices = yield* tts.listVoices({ gender: input.gender });

    return {
      voices,
    };
  }).pipe(
    Effect.withSpan('useCase.listVoices', {
      attributes: {
        'filter.gender': input.gender,
      },
    }),
  );
