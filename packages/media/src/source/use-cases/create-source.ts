import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import type { CreateSource } from '@repo/db/schema';
import {
  annotateUseCaseSpan,
  calculateWordCount,
  withUseCaseSpan,
} from '../../shared';
import { SourceRepo } from '../repos';
import { sanitizeMetadata } from '../sanitize-metadata';

// =============================================================================
// Types
// =============================================================================

export interface CreateSourceInput extends CreateSource {
  userId?: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const createSource = (input: CreateSourceInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const sourceRepo = yield* SourceRepo;

    const { userId = user.id, ...data } = input;

    const contentKey = `sources/${crypto.randomUUID()}.txt`;
    const contentBuffer = Buffer.from(data.content, 'utf-8');
    const wordCount = calculateWordCount(data.content);

    yield* storage.upload(contentKey, contentBuffer, 'text/plain');

    const doc = yield* sourceRepo
      .insert({
        title: data.title,
        contentKey,
        mimeType: 'text/plain',
        wordCount,
        source: 'manual',
        originalFileSize: contentBuffer.length,
        metadata: sanitizeMetadata(data.metadata),
        createdBy: userId,
      })
      .pipe(
        Effect.tapError(() => storage.delete(contentKey).pipe(Effect.ignore)),
      );
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: doc.id,
      attributes: {
        'source.id': doc.id,
        'source.title': input.title,
      },
    });
    return doc;
  }).pipe(withUseCaseSpan('useCase.createSource'));
