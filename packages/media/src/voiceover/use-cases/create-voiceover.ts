import { Effect } from 'effect';
import type { SourceId } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { getSourceContent } from '../../source/use-cases/get-source-content';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface CreateVoiceoverInput {
  title: string;
  sourceId?: SourceId;
}

// =============================================================================
// Use Case
// =============================================================================

export const createVoiceover = defineAuthedUseCase<CreateVoiceoverInput>()({
  name: 'useCase.createVoiceover',
  run: ({ input, user, annotateSpan }) =>
    Effect.gen(function* () {
      const voiceoverRepo = yield* VoiceoverRepo;
      const sourceId = input.sourceId;
      const sourceText = sourceId
        ? (yield* getSourceContent({ id: sourceId })).content
        : undefined;

      const voiceover = yield* voiceoverRepo.insert({
        title: input.title,
        createdBy: user.id,
        ...(sourceId
          ? {
              text: sourceText,
              sourceId,
            }
          : {}),
      });
      yield* annotateSpan({
        resourceId: voiceover.id,
        attributes: { 'voiceover.id': voiceover.id },
      });
      return voiceover;
    }),
});
