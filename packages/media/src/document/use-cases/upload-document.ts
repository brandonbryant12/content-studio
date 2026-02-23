import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import {
  annotateUseCaseSpan,
  calculateWordCount,
  withUseCaseSpan,
} from '../../shared';
import { getMimeType, parseUploadedFile } from '../parsers';
import { DocumentRepo } from '../repos';
import { sanitizeMetadata } from '../sanitize-metadata';

// =============================================================================
// Types
// =============================================================================

export interface UploadDocumentInput {
  fileName: string;
  mimeType: string;
  /** Base64-encoded file data */
  data: string;
  title?: string;
  metadata?: Record<string, JsonValue>;
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

    const mergedMetadata =
      input.metadata !== undefined
        ? { ...(parsed.metadata ?? {}), ...input.metadata }
        : parsed.metadata;

    const doc = yield* documentRepo
      .insert({
        title: input.title ?? parsed.title,
        contentKey,
        mimeType,
        wordCount,
        source: parsed.source,
        originalFileName: input.fileName,
        originalFileSize: data.length,
        metadata: sanitizeMetadata(mergedMetadata),
        createdBy: user.id,
      })
      .pipe(
        Effect.tapError(() => storage.delete(contentKey).pipe(Effect.ignore)),
      );
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: doc.id,
      attributes: {
        'document.id': doc.id,
        'file.name': input.fileName,
      },
    });
    return doc;
  }).pipe(
    withUseCaseSpan('useCase.uploadDocument'),
  );
