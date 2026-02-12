import { requireOwnership } from '@repo/auth/policy';
import { JobType } from '@repo/db/schema';
import {
  Queue,
  type ProcessUrlPayload,
  type ProcessResearchPayload,
} from '@repo/queue';
import { Effect } from 'effect';
import { DocumentAlreadyProcessing } from '../../errors';
import { DocumentRepo } from '../repos';

export interface RetryProcessingInput {
  id: string;
}

export const retryProcessing = (input: RetryProcessingInput) =>
  Effect.gen(function* () {
    const documentRepo = yield* DocumentRepo;
    const queue = yield* Queue;

    const doc = yield* documentRepo.findById(input.id);
    yield* requireOwnership(doc.createdBy);

    // Only allow retry on failed documents
    if (doc.status === 'processing') {
      return yield* new DocumentAlreadyProcessing({ id: doc.id });
    }
    if (doc.status !== 'failed') {
      // Document is ready — nothing to retry
      return doc;
    }

    // Reset status to processing, clear error
    yield* documentRepo.updateStatus(doc.id, 'processing');

    // Re-enqueue the appropriate job based on source type
    if (doc.source === 'url' && doc.sourceUrl) {
      yield* queue.enqueue(
        JobType.PROCESS_URL,
        {
          documentId: doc.id,
          url: doc.sourceUrl,
          userId: doc.createdBy,
        } satisfies ProcessUrlPayload,
        doc.createdBy,
      );
    } else if (doc.source === 'research' && doc.researchConfig) {
      yield* queue.enqueue(
        JobType.PROCESS_RESEARCH,
        {
          documentId: doc.id,
          query: doc.researchConfig.query,
          userId: doc.createdBy,
        } satisfies ProcessResearchPayload,
        doc.createdBy,
      );
    }

    return yield* documentRepo.findById(doc.id);
  }).pipe(
    Effect.withSpan('useCase.retryProcessing', {
      attributes: { 'document.id': input.id },
    }),
  );
