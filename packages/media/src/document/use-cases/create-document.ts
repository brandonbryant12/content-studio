import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import type { CreateDocument } from '@repo/db/schema';
import {
  annotateUseCaseSpan,
  calculateWordCount,
  withUseCaseSpan,
} from '../../shared';
import { DocumentRepo } from '../repos';
import { sanitizeMetadata } from '../sanitize-metadata';

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

    const doc = yield* documentRepo
      .insert({
        title: data.title,
        contentKey,
        mimeType: 'text/plain',
        wordCount,
        source: 'manual',
        originalFileSize: contentBuffer.length,
        metadata: sanitizeMetadata(data.metadata),
        createdBy: ownerId,
      })
      .pipe(
        Effect.tapError(() => storage.delete(contentKey).pipe(Effect.ignore)),
      );
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: doc.id,
      attributes: {
        'document.id': doc.id,
        'document.title': input.title,
      },
    });
    return doc;
  }).pipe(
    withUseCaseSpan('useCase.createDocument'),
  );
