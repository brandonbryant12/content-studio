import {
  createTestSource,
  createTestUser,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockSourceRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { awaitSourcesReady } from '../await-sources-ready';

describe('awaitSourcesReady', () => {
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    resetAllFactories();
    testUser = createTestUser();
  });

  it('returns immediately when all sources are ready', async () => {
    const doc = createTestSource({ status: 'ready' });

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockSourceRepo({
        findById: () => Effect.succeed(doc),
      }),
    );

    const result = await Effect.runPromise(
      withTestUser(testUser)(
        awaitSourcesReady({ sourceIds: [doc.id] }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result).toBeUndefined();
  });

  it('fails when any source is already failed', async () => {
    const doc = createTestSource({ status: 'failed' });

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockSourceRepo({
        findById: () => Effect.succeed(doc),
      }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(testUser)(
        awaitSourcesReady({ sourceIds: [doc.id] }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SourcesNotReadyTimeout');
    }
  });

  it('no-ops when given an empty source list', async () => {
    const layers = Layer.mergeAll(MockDbLive, createMockSourceRepo({}));

    const result = await Effect.runPromise(
      withTestUser(testUser)(
        awaitSourcesReady({ sourceIds: [] }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result).toBeUndefined();
  });
});
