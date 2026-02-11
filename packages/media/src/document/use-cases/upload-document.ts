import { Effect } from 'effect';
import { Storage } from '@repo/storage';
import { getCurrentUser } from '@repo/auth/policy';
import { DocumentRepo } from '../repos';
import { getMimeType, parseUploadedFile } from '../parsers';
import { calculateWordCount } from '../../shared';

// =============================================================================
// Types
// =============================================================================

export interface UploadDocumentInput {
  fileName: string;
  mimeType: string;
  data: Buffer;
  title?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Use Case
// =============================================================================

export const uploadDocument = (input: UploadDocumentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    const mimeType = getMimeType(input.fileName, input.mimeType);

    // parseUploadedFile validates size, format, and extracts content
    const parsed = yield* parseUploadedFile({
      fileName: input.fileName,
      mimeType,
      data: input.data,
    });

    const lastDot = input.fileName.lastIndexOf('.');
    const ext = lastDot > 0 ? input.fileName.slice(lastDot) : '';
    const contentKey = `documents/${crypto.randomUUID()}${ext}`;

    yield* storage.upload(contentKey, input.data, mimeType);

    const wordCount = calculateWordCount(parsed.content);

    return yield* documentRepo
      .insert({
        title: input.title ?? parsed.title,
        contentKey,
        mimeType,
        wordCount,
        source: parsed.source,
        originalFileName: input.fileName,
        originalFileSize: input.data.length,
        metadata: { ...parsed.metadata, ...input.metadata },
        createdBy: user.id,
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
    Effect.withSpan('useCase.uploadDocument', {
      attributes: {
        'file.name': input.fileName,
        'file.size': input.data.length,
      },
    }),
  );
