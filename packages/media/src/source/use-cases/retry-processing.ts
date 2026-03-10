import { getCurrentUser } from '@repo/auth/policy';
import { SourceStatus, JobType } from '@repo/db/schema';
import { Effect } from 'effect';
import type { ProcessUrlPayload, ProcessResearchPayload } from '@repo/queue';
import { SourceAlreadyProcessing } from '../../errors';
import {
  annotateUseCaseSpan,
  enqueueJob,
  formatUnknownError,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
import { SourceRepo } from '../repos';
import { ensureDeepResearchEnabled } from '../services/deep-research-feature';

export interface RetryProcessingInput {
  id: string;
}

export const retryProcessing = (input: RetryProcessingInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const sourceRepo = yield* SourceRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'source.id': input.id },
    });
    const doc = yield* sourceRepo.findByIdForUser(input.id, user.id);

    // Only allow retry on failed sources
    if (doc.status === SourceStatus.PROCESSING) {
      return yield* new SourceAlreadyProcessing({ id: doc.id });
    }
    if (doc.status !== SourceStatus.FAILED) {
      // Source is ready — nothing to retry
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
              sourceId: doc.id,
              url: doc.sourceUrl,
              userId: doc.createdBy,
            },
            failureLabel: 'URL',
          }
        : doc.source === 'research' && doc.researchConfig
          ? {
              type: JobType.PROCESS_RESEARCH,
              payload: {
                sourceId: doc.id,
                query: doc.researchConfig.query,
                userId: doc.createdBy,
              },
              failureLabel: 'research',
            }
          : null;

    if (retryJob?.type === JobType.PROCESS_RESEARCH) {
      yield* ensureDeepResearchEnabled;
    }

    // Re-enqueue when source type has a dedicated retry job.
    if (retryJob) {
      yield* withTransactionalStateAndEnqueue(
        Effect.gen(function* () {
          yield* sourceRepo.updateStatus(doc.id, SourceStatus.PROCESSING);
          yield* enqueueJob({
            type: retryJob.type,
            payload: retryJob.payload,
            userId: doc.createdBy,
          });
        }),
        (error) =>
          sourceRepo.updateStatus(
            doc.id,
            SourceStatus.FAILED,
            `Failed to enqueue ${retryJob.failureLabel} retry: ${formatUnknownError(error)}`,
          ),
      );
    } else {
      yield* sourceRepo.updateStatus(doc.id, SourceStatus.PROCESSING);
    }

    return yield* sourceRepo.findByIdForUser(doc.id, user.id);
  }).pipe(withUseCaseSpan('useCase.retryProcessing'));
