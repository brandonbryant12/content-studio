import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { calculateWordCount } from '../../shared';
import { getMimeType, parseUploadedFile } from '../parsers';
import { DocumentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface UploadDocumentInput {
  fileName: string;
  mimeType: string;
  /** Base64-encoded file data */
  data: string;
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

    const data = Buffer.from(input.data, 'base64');
    const mimeType = getMimeType(input.fileName, input.mimeType);

    // parseUploadedFile validates size, format, and extracts content
    const parsed = yield* parseUploadedFile({
      fileName: input.fileName,
      mimeType,
      data,
    });

    const lastDot = input.fileName.lastIndexOf('.');
    const ext = lastDot > 0 ? input.fileName.slice(lastDot) : '';
    const contentKey = `documents/${crypto.randomUUID()}${ext}`;

    yield* storage.upload(contentKey, data, mimeType);

    const wordCount = calculateWordCount(parsed.content);

    return yield* documentRepo
      .insert({
        title: input.title ?? parsed.title,
        contentKey,
        mimeType,
        wordCount,
        source: parsed.source,
        originalFileName: input.fileName,
        originalFileSize: data.length,
        metadata: { ...parsed.metadata, ...input.metadata },
        createdBy: user.id,
      })
      .pipe(
        Effect.tapError(() => storage.delete(contentKey).pipe(Effect.ignore)),
      );
  }).pipe(
    Effect.withSpan('useCase.uploadDocument', {
      attributes: {
        'file.name': input.fileName,
      },
    }),
  );
