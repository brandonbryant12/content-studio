import { Effect } from 'effect';
import {
  TTS,
  type GeminiVoiceId,
  type AudioEncoding,
  isValidVoiceId,
} from '../index';
import { VoiceNotFoundError } from './errors';

// =============================================================================
// Types
// =============================================================================

export interface PreviewVoiceInput {
  readonly voiceId: string;
  readonly text?: string;
  readonly audioEncoding?: AudioEncoding;
}

export interface PreviewVoiceUseCaseResult {
  readonly audioContent: Buffer;
  readonly audioEncoding: AudioEncoding;
  readonly voiceId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Generate a preview audio sample for a voice.
 *
 * This use case generates a short audio preview for the specified voice.
 * If no text is provided, a default sample text is used.
 *
 * @example
 * // Preview with default text
 * const result = yield* previewVoice({ voiceId: 'Charon' });
 *
 * // Preview with custom text
 * const result = yield* previewVoice({
 *   voiceId: 'Kore',
 *   text: 'Hello, this is a test.',
 *   audioEncoding: 'MP3',
 * });
 */
export const previewVoice = (input: PreviewVoiceInput) =>
  Effect.gen(function* () {
    // Validate voice ID
    if (!isValidVoiceId(input.voiceId)) {
      return yield* Effect.fail(
        new VoiceNotFoundError({ voiceId: input.voiceId }),
      );
    }

    const tts = yield* TTS;
    const result = yield* tts.previewVoice({
      voiceId: input.voiceId as GeminiVoiceId,
      text: input.text,
      audioEncoding: input.audioEncoding,
    });

    return {
      audioContent: result.audioContent,
      audioEncoding: result.audioEncoding,
      voiceId: result.voiceId,
    };
  }).pipe(
    Effect.withSpan('useCase.previewVoice', {
      attributes: {
        'voice.id': input.voiceId,
        'audio.encoding': input.audioEncoding,
      },
    }),
  );
