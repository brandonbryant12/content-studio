import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import type { VoiceGender, VoiceInfo } from '../voices';
import { TTS } from '../service';

// =============================================================================
// Types
// =============================================================================

export interface ListVoicesWithPreviewsInput {
  readonly gender?: VoiceGender;
}

export interface VoiceWithPreview extends VoiceInfo {
  readonly previewUrl: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

const getErrorTag = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof error._tag === 'string'
  ) {
    return error._tag;
  }
  return 'UnknownError';
};

const resolvePreviewUrl = (voiceId: string) => {
  const key = `voice-previews/${voiceId}.wav`;

  return Effect.gen(function* () {
    const storage = yield* Storage;
    const exists = yield* storage.exists(key);
    if (!exists) return null;
    return yield* storage.getUrl(key);
  }).pipe(
    Effect.tapError((error) =>
      Effect.logWarning(
        `Voice preview metadata lookup failed for ${voiceId} [errorTag:${getErrorTag(error)}]`,
      ),
    ),
    Effect.withSpan('tts.resolveVoicePreviewUrl', {
      attributes: {
        'voice.id': voiceId,
        'storage.key': key,
      },
    }),
  );
};

// =============================================================================
// Use Case
// =============================================================================

/**
 * List available TTS voices with their preview URLs.
 *
 * This use case combines voice listing with preview URL resolution from storage.
 * Each voice is enriched with a `previewUrl` if a preview WAV file exists in storage.
 *
 * @example
 * const voices = yield* listVoicesWithPreviews({});
 */
export const listVoicesWithPreviews = (input: ListVoicesWithPreviewsInput) =>
  Effect.gen(function* () {
    const tts = yield* TTS;
    const voices = yield* tts.listVoices({ gender: input.gender });

    return yield* Effect.all(
      voices.map((voice) =>
        resolvePreviewUrl(voice.id).pipe(
          Effect.map(
            (previewUrl): VoiceWithPreview => ({ ...voice, previewUrl }),
          ),
        ),
      ),
      { concurrency: 'unbounded' },
    );
  }).pipe(
    Effect.withSpan('useCase.listVoicesWithPreviews', {
      attributes: {
        'filter.gender': input.gender,
      },
    }),
  );
