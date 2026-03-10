import { JobStatus, SourceStatus, JobType } from '@repo/db/schema';
import { DeepResearchFeature, SourceRepo } from '@repo/media';
import {
  Queue,
  formatError,
  type Job,
  type ProcessResearchPayload,
} from '@repo/queue';
import { Effect } from 'effect';
import { emitEntityChange, type PublishEvent } from './events';

const hasActiveResearchJobForSource = (
  jobs: readonly Job[],
  sourceId: string,
): boolean =>
  jobs.some(
    (job) =>
      (job.status === JobStatus.PENDING ||
        job.status === JobStatus.PROCESSING) &&
      typeof job.payload === 'object' &&
      job.payload !== null &&
      'sourceId' in job.payload &&
      job.payload.sourceId === sourceId,
  );

export const recoverOrphanedResearch = (publishEvent: PublishEvent) =>
  Effect.gen(function* () {
    const deepResearchFeature = yield* DeepResearchFeature;
    const sourceRepo = yield* SourceRepo;
    const queue = yield* Queue;
    const activeJobsByUser = new Map<string, Job[]>();

    if (!deepResearchFeature.enabled) {
      yield* Effect.logInfo(
        'Skipping orphaned research recovery because deep research is disabled',
      );
      return;
    }

    const orphans = yield* sourceRepo.findOrphanedResearch();

    if (orphans.length === 0) return;

    for (const doc of orphans) {
      // Reset status to processing (stale reaper may have marked it failed)
      yield* sourceRepo.updateStatus(doc.id, SourceStatus.PROCESSING);

      const userActiveJobs =
        activeJobsByUser.get(doc.createdBy) ??
        (yield* queue.getJobsByUser(
          doc.createdBy,
          JobType.PROCESS_RESEARCH,
        )).filter(
          (job) =>
            job.status === JobStatus.PENDING ||
            job.status === JobStatus.PROCESSING,
        );

      activeJobsByUser.set(doc.createdBy, userActiveJobs);

      if (hasActiveResearchJobForSource(userActiveJobs, doc.id)) {
        yield* Effect.logInfo(
          `Skipping recovery enqueue for ${doc.id}; an active process-research job already exists`,
        );
        emitEntityChange(publishEvent, doc.createdBy, 'source', doc.id);
        continue;
      }

      // Re-enqueue process-research job — processResearch will see the
      // existing operationId and resume polling instead of starting fresh
      const enqueuedJob = yield* queue.enqueue(
        JobType.PROCESS_RESEARCH,
        {
          sourceId: doc.id,
          query: doc.researchConfig!.query,
          userId: doc.createdBy,
        } satisfies ProcessResearchPayload,
        doc.createdBy,
      );
      userActiveJobs.push(enqueuedJob);

      emitEntityChange(publishEvent, doc.createdBy, 'source', doc.id);
    }

    const summary = orphans.map((d) => d.id).join(', ');
    yield* Effect.logInfo(
      `Recovered ${orphans.length} orphaned research docs: ${summary}`,
    );
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logError(`Research recovery error: ${formatError(error)}`),
    ),
    Effect.annotateLogs('worker', 'ResearchRecovery'),
  );
