import { DocumentStatus, JobType } from '@repo/db/schema';
import { DocumentRepo } from '@repo/media';
import { Queue, formatError, type ProcessResearchPayload } from '@repo/queue';
import { Effect } from 'effect';
import { emitEntityChange, type PublishEvent } from './events';

export const recoverOrphanedResearch = (publishEvent: PublishEvent) =>
  Effect.gen(function* () {
    const documentRepo = yield* DocumentRepo;
    const queue = yield* Queue;

    const orphans = yield* documentRepo.findOrphanedResearch();

    if (orphans.length === 0) return;

    for (const doc of orphans) {
      // Reset status to processing (stale reaper may have marked it failed)
      yield* documentRepo.updateStatus(doc.id, DocumentStatus.PROCESSING);

      // Re-enqueue process-research job — processResearch will see the
      // existing operationId and resume polling instead of starting fresh
      yield* queue.enqueue(
        JobType.PROCESS_RESEARCH,
        {
          documentId: doc.id,
          query: doc.researchConfig!.query,
          userId: doc.createdBy,
        } satisfies ProcessResearchPayload,
        doc.createdBy,
      );

      emitEntityChange(publishEvent, doc.createdBy, 'document', doc.id);
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
