import { syncEntityTitle } from '@repo/media/activity';
import { generateVoiceoverAudio } from '@repo/media/voiceover';
import { Effect } from 'effect';
import type {
  GenerateVoiceoverPayload,
  GenerateVoiceoverResult,
} from '@repo/queue';
import { defineJobHandler } from './job-handler';

export const handleGenerateVoiceover =
  defineJobHandler<GenerateVoiceoverPayload>()({
    span: 'worker.handleGenerateVoiceover',
    errorMessage: 'Failed to generate voiceover audio',
    attributes: (job) => ({
      'voiceover.id': job.payload.voiceoverId,
    }),
    run: (job) =>
      Effect.gen(function* () {
        const { voiceoverId } = job.payload;

        const result = yield* generateVoiceoverAudio({ voiceoverId });

        yield* syncEntityTitle(result.voiceover.id, result.voiceover.title);

        return {
          voiceoverId: result.voiceover.id,
          audioUrl: result.audioUrl,
          duration: result.duration,
        } satisfies GenerateVoiceoverResult;
      }),
  });
