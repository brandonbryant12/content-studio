import { generateVoiceoverAudio, syncEntityTitle } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type {
  GenerateVoiceoverPayload,
  GenerateVoiceoverResult,
  Job,
} from '@repo/queue';

export const handleGenerateVoiceover = (job: Job<GenerateVoiceoverPayload>) =>
  Effect.gen(function* () {
    const { voiceoverId } = job.payload;

    const result = yield* generateVoiceoverAudio({ voiceoverId });

    yield* syncEntityTitle(result.voiceover.id, result.voiceover.title);

    return {
      voiceoverId: result.voiceover.id,
      audioUrl: result.audioUrl,
      duration: result.duration,
    } satisfies GenerateVoiceoverResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate voiceover audio: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleGenerateVoiceover', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'voiceover.id': job.payload.voiceoverId,
      },
    }),
  );
