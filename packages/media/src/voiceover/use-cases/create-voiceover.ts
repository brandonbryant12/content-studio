import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { DocumentId } from '@repo/db/schema';
import { getDocumentContent } from '../../document/use-cases/get-document-content';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface CreateVoiceoverInput {
  title: string;
  documentId?: DocumentId;
}

// =============================================================================
// Use Case
// =============================================================================

export const createVoiceover = (input: CreateVoiceoverInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const voiceoverRepo = yield* VoiceoverRepo;
    const sourceDocumentId = input.documentId;
    const sourceText = sourceDocumentId
      ? (yield* getDocumentContent({ id: sourceDocumentId })).content
      : undefined;

    const voiceover = yield* voiceoverRepo.insert({
      title: input.title,
      createdBy: user.id,
      ...(sourceDocumentId
        ? {
            text: sourceText,
            sourceDocumentId,
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
