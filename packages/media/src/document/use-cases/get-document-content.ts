import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { DocumentContentNotFound } from '../../errors';
import { annotateUseCaseSpan } from '../../shared';
import { parseDocumentContent } from '../parsers';
import { DocumentRepo } from '../repos';

export interface GetDocumentContentInput {
  id: string;
}

export interface GetDocumentContentResult {
  content: string;
}

export const getDocumentContent = (input: GetDocumentContentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    const doc = yield* documentRepo.findByIdForUser(input.id, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'document.id': input.id },
    });

    // Fast path: return denormalized extracted text if available
    if (doc.extractedText) {
      return { content: doc.extractedText };
    }

    const buffer = yield* storage.download(doc.contentKey).pipe(
      Effect.catchTag('StorageNotFoundError', () =>
        Effect.fail(
          new DocumentContentNotFound({
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

    const content = yield* parseDocumentContent({
      fileName: doc.originalFileName ?? 'file',
      mimeType: doc.mimeType,
      data: buffer,
    });

    return { content };
  }).pipe(Effect.withSpan('useCase.getDocumentContent'));
