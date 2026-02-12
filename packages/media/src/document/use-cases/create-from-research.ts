import { getCurrentUser } from '@repo/auth/policy';
import { JobType } from '@repo/db/schema';
import { Queue, type ProcessResearchPayload } from '@repo/queue';
import { Effect } from 'effect';
import { DocumentRepo } from '../repos';

export interface CreateFromResearchInput {
  query: string;
  title?: string;
}

export const createFromResearch = (input: CreateFromResearchInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;
    const queue = yield* Queue;

    // Derive title from query if not provided
    const title =
      input.title ||
      `Research: ${input.query.slice(0, 100)}${input.query.length > 100 ? '…' : ''}`;

    // Insert document row in processing state
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

    // Enqueue process-research job
    yield* queue.enqueue(
      JobType.PROCESS_RESEARCH,
      {
        documentId: doc.id,
        query: input.query,
        userId: user.id,
      } satisfies ProcessResearchPayload,
      user.id,
    );

    return doc;
  }).pipe(
    Effect.withSpan('useCase.createFromResearch', {
      attributes: { 'document.researchQuery': input.query.slice(0, 100) },
    }),
  );
