import { getCurrentUser } from '@repo/auth/policy';
import { JobType } from '@repo/db/schema';
import { Effect } from 'effect';
import type { ProcessResearchPayload } from '@repo/queue';
import {
  enqueueJob,
  formatUnknownError,
  withTransactionalStateAndEnqueue,
} from '../../shared';
import { DocumentRepo } from '../repos';

export interface CreateFromResearchInput {
  query: string;
  title?: string;
}

export const createFromResearch = (input: CreateFromResearchInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;

    // Derive title from query if not provided
    const title =
      input.title ||
      `Research: ${input.query.slice(0, 100)}${input.query.length > 100 ? '…' : ''}`;

    let insertedDocumentId: string | null = null;
    return yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        const doc = yield* documentRepo.insert({
          title,
          contentKey: `documents/pending-${crypto.randomUUID()}.txt`,
          mimeType: 'text/plain',
          wordCount: 0,
          source: 'research',
          status: 'processing',
          researchConfig: { query: input.query },
          createdBy: user.id,
        });
        insertedDocumentId = doc.id;

        yield* enqueueJob({
          type: JobType.PROCESS_RESEARCH,
          payload: {
            documentId: doc.id,
            query: input.query,
            userId: user.id,
          } satisfies ProcessResearchPayload,
          userId: user.id,
        });

        return doc;
      }),
      (error) =>
        insertedDocumentId
          ? documentRepo.updateStatus(
              insertedDocumentId,
              'failed',
              `Failed to enqueue research processing: ${formatUnknownError(error)}`,
            )
          : Effect.void,
    );
  }).pipe(
    Effect.withSpan('useCase.createFromResearch', {
      attributes: { 'document.researchQuery': input.query.slice(0, 100) },
    }),
  );
