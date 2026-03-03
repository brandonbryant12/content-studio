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
    const insertInput: {
      title: string;
      createdBy: string;
      text?: string;
      sourceDocumentId?: DocumentId;
    } = {
      title: input.title,
      createdBy: user.id,
    };

    if (input.documentId) {
      const source = yield* getDocumentContent({ id: input.documentId });
      insertInput.text = source.content;
      insertInput.sourceDocumentId = input.documentId;
    }

    const voiceover = yield* voiceoverRepo.insert(insertInput);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: voiceover.id,
      attributes: { 'voiceover.id': voiceover.id },
    });
    return voiceover;
  }).pipe(withUseCaseSpan('useCase.createVoiceover'));
