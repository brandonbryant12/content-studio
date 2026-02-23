import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlideDeck } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { deleteSlideDeck } from '../delete-slide-deck';

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

describe('deleteSlideDeck', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('deletes a deck owned by current user', async () => {
    const user = createTestUser();
    const deck = createDeck(user.id);
    const deleteSpy = vi.fn().mockReturnValue(Effect.succeed(true));

    const repo = createMockSlideDeckRepo({
      findByIdForUser: () => Effect.succeed(deck),
      delete: deleteSpy,
    });

    await Effect.runPromise(
      withTestUser(user)(
        deleteSlideDeck({ id: deck.id }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo)),
        ),
      ),
    );

    expect(deleteSpy).toHaveBeenCalledWith(deck.id);
  });
});
