import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SlideDeck, SlideDeckVersion } from '@repo/db/schema';
import { SlideDeckNotFound } from '../../../errors';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { getSlideDeckVersions } from '../get-slide-deck-versions';

const createDeck = (createdBy: string): SlideDeck =>
  ({
    id: 'sld_test0000000001',
    title: 'Quarterly Review',
    prompt: null,
    sourceDocumentIds: [],
    theme: 'executive',
    slides: [],
    generatedHtml: null,
    status: 'ready',
    errorMessage: null,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as SlideDeck;

const createVersion = (deckId: string, versionNumber: number): SlideDeckVersion =>
  ({
    id: `sldv_test000000000${versionNumber}`,
    slideDeckId: deckId,
    versionNumber,
    prompt: null,
    sourceDocumentIds: [],
    theme: 'executive',
    slides: [],
    generatedHtml: '<html></html>',
    createdAt: new Date(),
  }) as unknown as SlideDeckVersion;

describe('getSlideDeckVersions', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns versions for an owned deck', async () => {
    const user = createTestUser();
    const deck = createDeck(user.id);
    const versions = [createVersion(deck.id, 1), createVersion(deck.id, 2)];

    const repo = createMockSlideDeckRepo({
      findByIdForUser: () => Effect.succeed(deck),
      listVersions: () => Effect.succeed(versions),
    });

    const result = await Effect.runPromise(
      withTestUser(user)(
        getSlideDeckVersions({ slideDeckId: deck.id }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo)),
        ),
      ),
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.versionNumber).toBe(1);
    expect(result[1]?.versionNumber).toBe(2);
  });

  it('returns empty list when no versions exist', async () => {
    const user = createTestUser();
    const deck = createDeck(user.id);

    const repo = createMockSlideDeckRepo({
      findByIdForUser: () => Effect.succeed(deck),
      listVersions: () => Effect.succeed([] as readonly SlideDeckVersion[]),
    });

    const result = await Effect.runPromise(
      withTestUser(user)(
        getSlideDeckVersions({ slideDeckId: deck.id }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo)),
        ),
      ),
    );

    expect(result).toEqual([]);
  });

  it('fails with SlideDeckNotFound for non-owners', async () => {
    const user = createTestUser();
    const deck = createDeck('different-user');

    const repo = createMockSlideDeckRepo({
      findByIdForUser: (id) => Effect.fail(new SlideDeckNotFound({ id })),
    });

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        getSlideDeckVersions({ slideDeckId: deck.id }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo)),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SlideDeckNotFound');
      expect((error as SlideDeckNotFound).id).toBe(deck.id);
    }
  });
});
