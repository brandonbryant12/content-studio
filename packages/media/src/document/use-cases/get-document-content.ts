import { Effect } from 'effect';
import { Storage } from '@repo/storage';
import { requireOwnership } from '@repo/auth/policy';
import { DocumentRepo } from '../repos';
import { parseDocumentContent } from '../parsers';
import { DocumentContentNotFound } from '../../errors';

export interface GetDocumentContentInput {
  id: string;
}

export interface GetDocumentContentResult {
  content: string;
}

export const getDocumentContent = (input: GetDocumentContentInput) =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    const doc = yield* documentRepo.findById(input.id);
    yield* requireOwnership(doc.createdBy);

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
  }).pipe(
    Effect.withSpan('useCase.getDocumentContent', {
      attributes: { 'document.id': input.id },
    }),
  );
