import { Effect } from 'effect';
import { withAIUsageScope } from '../../usage';
import { TTS, type AudioEncoding } from '../index';

// =============================================================================
// Types
// =============================================================================

export interface PreviewVoiceInput {
  readonly voiceId: string;
  readonly text?: string;
}

export interface PreviewVoiceUseCaseResult {
  readonly audioContent: Buffer;
  readonly audioEncoding: AudioEncoding;
  readonly voiceId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/** Generate a preview audio sample for a voice. */
export const previewVoice = (input: PreviewVoiceInput) =>
  Effect.gen(function* () {
    const tts = yield* TTS;
    return yield* tts.previewVoice({
      voiceId: input.voiceId,
      text: input.text,
    });
  }).pipe(
    withAIUsageScope({
      operation: 'useCase.previewVoice',
      resourceType: 'voice',
      resourceId: input.voiceId,
    }),
    Effect.withSpan('useCase.previewVoice', {
      attributes: {
        'voice.id': input.voiceId,
      },
    }),
  );
