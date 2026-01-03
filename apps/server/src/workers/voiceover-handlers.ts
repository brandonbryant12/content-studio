import { generateVoiceoverAudio } from '@repo/media';
import { JobProcessingError } from '@repo/queue';
import { Effect } from 'effect';
import type {
  GenerateVoiceoverPayload,
  GenerateVoiceoverResult,
  Job,
} from '@repo/queue';

/**
 * Format an error for logging - handles Effect tagged errors and standard errors.
 */
const formatError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    // Effect tagged error
    if ('_tag' in error) {
      const tag = (error as { _tag: string })._tag;
      const message =
        'message' in error ? (error as { message: string }).message : '';
      return message ? `${tag}: ${message}` : tag;
    }
    // Standard Error
    if (error instanceof Error) {
      return error.message || error.name;
    }
  }
  return String(error);
};

/**
 * Handler for generate-voiceover jobs.
 * Generates TTS audio from voiceover text.
 *
 * Requires: VoiceoverRepo, VoiceoverCollaboratorRepo, TTS, Storage
 */
export const handleGenerateVoiceover = (job: Job<GenerateVoiceoverPayload>) =>
  Effect.gen(function* () {
    const { voiceoverId } = job.payload;

    // Generate audio for voiceover
    const result = yield* generateVoiceoverAudio({
      voiceoverId,
    });

    return {
      voiceoverId: result.voiceover.id,
      audioUrl: result.audioUrl,
      duration: result.duration,
    } satisfies GenerateVoiceoverResult;
  }).pipe(
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);
      console.error(
        '[VoiceoverWorker] Audio generation failed:',
        errorMessage,
        error,
      );

      return Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate voiceover audio: ${errorMessage}`,
          cause: error,
        }),
      );
    }),
    Effect.withSpan('worker.handleGenerateVoiceover', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'voiceover.id': job.payload.voiceoverId,
      },
    }),
  );
