import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { SourceContentNotFound } from '../../errors';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { parseSourceContent } from '../parsers';
import { SourceRepo } from '../repos';

export interface GetSourceContentInput {
  id: string;
}

export interface GetSourceContentResult {
  content: string;
}

export const getSourceContent = (input: GetSourceContentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const sourceRepo = yield* SourceRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'source.id': input.id },
    });
    const doc = yield* sourceRepo.findByIdForUser(input.id, user.id);

    // Fast path: return denormalized extracted text if available
    if (doc.extractedText) {
      return { content: doc.extractedText };
    }

    const buffer = yield* storage.download(doc.contentKey).pipe(
      Effect.catchTag('StorageNotFoundError', () =>
        Effect.fail(
          new SourceContentNotFound({
            id: doc.id,
            title: doc.title,
            contentKey: doc.contentKey,
          }),
        ),
      ),
    );

    if (doc.mimeType === 'text/plain') {
      return { content: buffer.toString('utf-8') };
    }

    const content = yield* parseSourceContent({
      fileName: doc.originalFileName ?? 'file',
      mimeType: doc.mimeType,
      data: buffer,
    });

    return { content };
  }).pipe(withUseCaseSpan('useCase.getSourceContent'));
