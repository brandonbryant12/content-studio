import { getCurrentUser } from '@repo/auth/policy';
import { JobType } from '@repo/db/schema';
import { Effect } from 'effect';
import type { ProcessUrlPayload } from '@repo/queue';
import { DocumentAlreadyProcessing } from '../../errors';
import {
  enqueueJob,
  formatUnknownError,
  withTransactionalStateAndEnqueue,
} from '../../shared';
import { DocumentRepo } from '../repos';
import { validateUrl } from '../services/url-validator';

export interface CreateFromUrlInput {
  url: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export const createFromUrl = (input: CreateFromUrlInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;

    // 1. Validate URL format + safety
    const parsed = yield* validateUrl(input.url);
    const url = parsed.href;

    // 2. Check for duplicate URL for this user
    const existing = yield* documentRepo.findBySourceUrl(url, user.id);
    if (existing) {
      if (existing.status === 'ready') {
        return existing;
      }
      if (existing.status === 'processing') {
        return yield* new DocumentAlreadyProcessing({ id: existing.id });
      }
      // If failed, allow creating a new one (delete the old one)
      yield* documentRepo.delete(existing.id);
    }

    // 3. Derive title from URL if not provided
    const title = input.title || parsed.hostname + parsed.pathname;
    let insertedDocumentId: string | null = null;
    return yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        const doc = yield* documentRepo.insert({
          title,
          contentKey: `documents/pending-${crypto.randomUUID()}.txt`,
          mimeType: 'text/plain',
          wordCount: 0,
          source: 'url',
          sourceUrl: url,
          status: 'processing',
          metadata: input.metadata,
          createdBy: user.id,
        });
        insertedDocumentId = doc.id;

        yield* enqueueJob({
          type: JobType.PROCESS_URL,
          payload: {
            documentId: doc.id,
            url,
            userId: user.id,
          } satisfies ProcessUrlPayload,
          userId: user.id,
        });

        return doc;
      }),
      (error) =>
        insertedDocumentId
          ? documentRepo.updateStatus(
              insertedDocumentId,
              'failed',
              `Failed to enqueue URL processing: ${formatUnknownError(error)}`,
            )
          : Effect.void,
    );
  }).pipe(
    Effect.withSpan('useCase.createFromUrl', {
      attributes: { 'document.url': input.url },
    }),
  );
