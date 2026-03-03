import { getCurrentUser } from '@repo/auth/policy';
import { DocumentStatus, JobType } from '@repo/db/schema';
import { Effect } from 'effect';
import type { ProcessUrlPayload, ProcessResearchPayload } from '@repo/queue';
import { DocumentAlreadyProcessing } from '../../errors';
import {
  annotateUseCaseSpan,
  enqueueJob,
  formatUnknownError,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
import { DocumentRepo } from '../repos';

export interface RetryProcessingInput {
  id: string;
}

export const retryProcessing = (input: RetryProcessingInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'document.id': input.id },
    });
    const doc = yield* documentRepo.findByIdForUser(input.id, user.id);

    // Only allow retry on failed documents
    if (doc.status === DocumentStatus.PROCESSING) {
      return yield* new DocumentAlreadyProcessing({ id: doc.id });
    }
    if (doc.status !== DocumentStatus.FAILED) {
      // Document is ready — nothing to retry
      return doc;
    }

    const retryJob:
      | {
          type: typeof JobType.PROCESS_URL;
          payload: ProcessUrlPayload;
          failureLabel: 'URL';
        }
      | {
          type: typeof JobType.PROCESS_RESEARCH;
          payload: ProcessResearchPayload;
          failureLabel: 'research';
        }
      | null =
      doc.source === 'url' && doc.sourceUrl
        ? {
            type: JobType.PROCESS_URL,
            payload: {
              documentId: doc.id,
              url: doc.sourceUrl,
              userId: doc.createdBy,
            },
            failureLabel: 'URL',
          }
        : doc.source === 'research' && doc.researchConfig
          ? {
              type: JobType.PROCESS_RESEARCH,
              payload: {
                documentId: doc.id,
                query: doc.researchConfig.query,
                userId: doc.createdBy,
              },
              failureLabel: 'research',
            }
          : null;

    // Re-enqueue when source type has a dedicated retry job.
    if (retryJob) {
      yield* withTransactionalStateAndEnqueue(
        Effect.gen(function* () {
          yield* documentRepo.updateStatus(doc.id, DocumentStatus.PROCESSING);
          yield* enqueueJob({
            type: retryJob.type,
            payload: retryJob.payload,
            userId: doc.createdBy,
          });
        }),
        (error) =>
          documentRepo.updateStatus(
            doc.id,
            DocumentStatus.FAILED,
            `Failed to enqueue ${retryJob.failureLabel} retry: ${formatUnknownError(error)}`,
          ),
      );
    } else {
      yield* documentRepo.updateStatus(doc.id, DocumentStatus.PROCESSING);
    }

    return yield* documentRepo.findByIdForUser(doc.id, user.id);
  }).pipe(withUseCaseSpan('useCase.retryProcessing'));
