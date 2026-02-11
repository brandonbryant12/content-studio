import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { Queue, type ProcessUrlPayload } from '@repo/queue';
import { JobType } from '@repo/db/schema';
import { DocumentRepo } from '../repos';
import { validateUrl } from '../services/url-validator';
import { DocumentAlreadyProcessing } from '../../errors';

export interface CreateFromUrlInput {
  url: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export const createFromUrl = (input: CreateFromUrlInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;
    const queue = yield* Queue;

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

    // 4. Insert document row in processing state
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

    // 5. Enqueue process-url job
    yield* queue.enqueue(
      JobType.PROCESS_URL,
      {
        documentId: doc.id,
        url,
        userId: user.id,
      } satisfies ProcessUrlPayload,
      user.id,
    );

    return doc;
  }).pipe(
    Effect.withSpan('useCase.createFromUrl', {
      attributes: { 'document.url': input.url },
    }),
  );
