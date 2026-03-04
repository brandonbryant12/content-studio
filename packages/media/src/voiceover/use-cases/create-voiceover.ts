import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { SourceId } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

export const createVoiceover = (input: CreateVoiceoverInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
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
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: voiceover.id,
      attributes: { 'voiceover.id': voiceover.id },
    });
    return voiceover;
  }).pipe(withUseCaseSpan('useCase.createVoiceover'));
