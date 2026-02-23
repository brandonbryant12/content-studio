import { Queue, QueueError, type QueueService } from '@repo/queue';
import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobId, SlideDeck } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { generateSlideDeck } from '../generate-slide-deck';

const createDeck = (createdBy: string): SlideDeck =>
  ({
    id: 'sld_test0000000001',
    title: 'Deck',
    prompt: null,
    sourceDocumentIds: [],
    theme: 'executive',
    slides: [],
    generatedHtml: null,
    status: 'draft',
    errorMessage: null,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as SlideDeck;

const createMockQueue = () => {
  const enqueueFn = vi
    .fn()
    .mockImplementation((_type, _payload, _userId) =>
      Effect.succeed({ id: 'job_123' as JobId, status: 'pending' as const }),
    );

  const service: QueueService = {
    enqueue: enqueueFn,
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
    claimNextJob: () => Effect.die('not implemented'),
    failStaleJobs: () => Effect.die('not implemented'),
  };

  return { enqueueFn, layer: Layer.succeed(Queue, service) };
};

describe('generateSlideDeck', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('sets status to generating and enqueues a job', async () => {
    const user = createTestUser();
    const deck = createDeck(user.id);
    const updateCalls: Array<{ status?: string; errorMessage?: string | null }> =
      [];

    const repo = createMockSlideDeckRepo({
      findByIdForUser: () => Effect.succeed(deck),
      update: (_id, data) => {
        updateCalls.push({
          status: data.status,
          errorMessage: data.errorMessage,
        });
        return Effect.succeed({ ...deck, ...data } as SlideDeck);
      },
    });

    const { enqueueFn, layer: queueLayer } = createMockQueue();

    const result = await Effect.runPromise(
      withTestUser(user)(
        generateSlideDeck({ id: deck.id }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo, queueLayer)),
        ),
      ),
    );

    expect(result.jobId).toBe('job_123');
    expect(updateCalls[0]).toEqual({ status: 'generating', errorMessage: null });
    expect(enqueueFn).toHaveBeenCalledWith(
      'generate-slide-deck',
      { slideDeckId: deck.id, userId: user.id },
      user.id,
    );
  });

  it('rolls status back when enqueue fails', async () => {
    const user = createTestUser();
    const deck = createDeck(user.id);
    const updateCalls: Array<{ status?: string; errorMessage?: string | null }> =
      [];

    const repo = createMockSlideDeckRepo({
      findByIdForUser: () => Effect.succeed(deck),
      update: (_id, data) => {
        updateCalls.push({
          status: data.status,
          errorMessage: data.errorMessage,
        });
        return Effect.succeed({ ...deck, ...data } as SlideDeck);
      },
    });

    const queueLayer = Layer.succeed(Queue, {
      enqueue: () => Effect.fail(new QueueError({ message: 'Queue down' })),
      getJob: () => Effect.die('not implemented'),
      getJobsByUser: () => Effect.die('not implemented'),
      updateJobStatus: () => Effect.die('not implemented'),
      processNextJob: () => Effect.die('not implemented'),
      processJobById: () => Effect.die('not implemented'),
      findPendingJobForPodcast: () => Effect.die('not implemented'),
      findPendingJobForVoiceover: () => Effect.die('not implemented'),
      deleteJob: () => Effect.die('not implemented'),
      claimNextJob: () => Effect.die('not implemented'),
      failStaleJobs: () => Effect.die('not implemented'),
    } as QueueService);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        generateSlideDeck({ id: deck.id }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo, queueLayer)),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    expect(updateCalls).toEqual([
      { status: 'generating', errorMessage: null },
      { status: 'draft', errorMessage: null },
    ]);
  });
});
