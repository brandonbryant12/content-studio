import {
  createTestDocument,
  createTestUser,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockDocumentRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { awaitDocumentsReady } from '../await-documents-ready';

describe('awaitDocumentsReady', () => {
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    resetAllFactories();
    testUser = createTestUser();
  });

  it('returns immediately when all documents are ready', async () => {
    const doc = createTestDocument({ status: 'ready' });

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
      }),
    );

    const result = await Effect.runPromise(
      withTestUser(testUser)(
        awaitDocumentsReady({ documentIds: [doc.id] }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result).toBeUndefined();
  });

  it('fails when any document is already failed', async () => {
    const doc = createTestDocument({ status: 'failed' });

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
      }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(testUser)(
        awaitDocumentsReady({ documentIds: [doc.id] }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('DocumentsNotReadyTimeout');
    }
  });

  it('no-ops when given an empty document list', async () => {
    const layers = Layer.mergeAll(
      MockDbLive,
      createMockDocumentRepo({}),
    );

    const result = await Effect.runPromise(
      withTestUser(testUser)(
        awaitDocumentsReady({ documentIds: [] }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result).toBeUndefined();
  });
});
