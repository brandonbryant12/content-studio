import { requireOwnership } from '@repo/auth/policy';
import { JobType } from '@repo/db/schema';
import { Effect } from 'effect';
import type { ProcessUrlPayload, ProcessResearchPayload } from '@repo/queue';
import { DocumentAlreadyProcessing } from '../../errors';
import {
  enqueueJob,
  formatUnknownError,
  withTransactionalStateAndEnqueue,
} from '../../shared';
import { DocumentRepo } from '../repos';

export interface RetryProcessingInput {
  id: string;
}

export const retryProcessing = (input: RetryProcessingInput) =>
  Effect.gen(function* () {
    const documentRepo = yield* DocumentRepo;

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

    // Re-enqueue the appropriate job based on source type
    if (doc.source === 'url' && doc.sourceUrl) {
      const sourceUrl = doc.sourceUrl;
      yield* withTransactionalStateAndEnqueue(
        Effect.gen(function* () {
          yield* documentRepo.updateStatus(doc.id, 'processing');
          yield* enqueueJob({
            type: JobType.PROCESS_URL,
            payload: {
              documentId: doc.id,
              url: sourceUrl,
              userId: doc.createdBy,
            } satisfies ProcessUrlPayload,
            userId: doc.createdBy,
          });
        }),
        (error) =>
          documentRepo.updateStatus(
            doc.id,
            'failed',
            `Failed to enqueue URL retry: ${formatUnknownError(error)}`,
          ),
      );
    } else if (doc.source === 'research' && doc.researchConfig) {
      const query = doc.researchConfig.query;
      yield* withTransactionalStateAndEnqueue(
        Effect.gen(function* () {
          yield* documentRepo.updateStatus(doc.id, 'processing');
          yield* enqueueJob({
            type: JobType.PROCESS_RESEARCH,
            payload: {
              documentId: doc.id,
              query,
              userId: doc.createdBy,
            } satisfies ProcessResearchPayload,
            userId: doc.createdBy,
          });
        }),
        (error) =>
          documentRepo.updateStatus(
            doc.id,
            'failed',
            `Failed to enqueue research retry: ${formatUnknownError(error)}`,
          ),
      );
    } else {
      yield* documentRepo.updateStatus(doc.id, 'processing');
    }

    return yield* documentRepo.findById(doc.id);
  }).pipe(
    Effect.withSpan('useCase.retryProcessing', {
      attributes: { 'document.id': input.id },
    }),
  );
