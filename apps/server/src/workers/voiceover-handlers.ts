import { generateVoiceoverAudio, syncEntityTitle } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type {
  GenerateVoiceoverPayload,
  GenerateVoiceoverResult,
  Job,
} from '@repo/queue';

/**
 * Handler for generate-voiceover jobs.
 * Generates TTS audio from voiceover text.
 *
 * Requires: VoiceoverRepo, TTS, Storage
 */
export const handleGenerateVoiceover = (job: Job<GenerateVoiceoverPayload>) =>
  Effect.gen(function* () {
    const { voiceoverId, userId } = job.payload;

    // Generate audio for voiceover
    const result = yield* generateVoiceoverAudio({
      voiceoverId,
      userId,
    });

    // Sync the title to activity log entries (voiceover may auto-generate a title)
    yield* syncEntityTitle(result.voiceover.id, result.voiceover.title);

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
