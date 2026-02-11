import { Effect } from 'effect';
import type { CreateDocument } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { getCurrentUser } from '@repo/auth/policy';
import { DocumentRepo } from '../repos';
import { calculateWordCount } from '../../shared';

// =============================================================================
// Types
// =============================================================================

export interface CreateDocumentInput extends CreateDocument {
  userId?: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const createDocument = (input: CreateDocumentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    const { userId, ...data } = input;
    const ownerId = userId ?? user.id;

    const contentKey = `documents/${crypto.randomUUID()}.txt`;
    const contentBuffer = Buffer.from(data.content, 'utf-8');
    const wordCount = calculateWordCount(data.content);

    yield* storage.upload(contentKey, contentBuffer, 'text/plain');

    return yield* documentRepo
      .insert({
        title: data.title,
        contentKey,
        mimeType: 'text/plain',
        wordCount,
        source: 'manual',
        originalFileSize: contentBuffer.length,
        metadata: data.metadata,
        createdBy: ownerId,
      })
      .pipe(
        Effect.catchAll((error) =>
          storage.delete(contentKey).pipe(
            Effect.ignore,
            Effect.flatMap(() => Effect.fail(error)),
          ),
        ),
      );
  }).pipe(
    Effect.withSpan('useCase.createDocument', {
      attributes: { 'document.title': input.title },
    }),
  );
