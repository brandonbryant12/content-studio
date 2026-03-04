import { getCurrentUser } from '@repo/auth/policy';
import { SourceStatus, JobType } from '@repo/db/schema';
import { Effect } from 'effect';
import type { ProcessResearchPayload } from '@repo/queue';
import {
  annotateUseCaseSpan,
  enqueueJob,
  formatUnknownError,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
import { SourceRepo } from '../repos';

export interface CreateFromResearchInput {
  query: string;
  title?: string;
  autoGeneratePodcast?: boolean;
}

export const createFromResearch = (input: CreateFromResearchInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const sourceRepo = yield* SourceRepo;

    // Derive title from query if not provided
    const title =
      input.title ||
      `Research: ${input.query.slice(0, 100)}${input.query.length > 100 ? '…' : ''}`;

    let insertedSourceId: string | undefined;
    const markEnqueueFailure = (error: unknown) => {
      if (!insertedSourceId) return Effect.void;
      return sourceRepo.updateStatus(
        insertedSourceId,
        SourceStatus.FAILED,
        `Failed to enqueue research processing: ${formatUnknownError(error)}`,
      );
    };

    return yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        const doc = yield* sourceRepo.insert({
          title,
          contentKey: `sources/pending-${crypto.randomUUID()}.txt`,
          mimeType: 'text/plain',
          wordCount: 0,
          source: 'research',
          status: SourceStatus.PROCESSING,
          researchConfig: {
            query: input.query,
            autoGeneratePodcast: input.autoGeneratePodcast === true,
          },
          createdBy: user.id,
        });
        insertedSourceId = doc.id;
        yield* annotateUseCaseSpan({
          userId: user.id,
          resourceId: doc.id,
          attributes: {
            'source.id': doc.id,
            'source.researchQuery': input.query.slice(0, 100),
          },
        });

        yield* enqueueJob({
          type: JobType.PROCESS_RESEARCH,
          payload: {
            sourceId: doc.id,
            query: input.query,
            userId: user.id,
          } satisfies ProcessResearchPayload,
          userId: user.id,
        });

        return doc;
      }),
      markEnqueueFailure,
    );
  }).pipe(withUseCaseSpan('useCase.createFromResearch'));
