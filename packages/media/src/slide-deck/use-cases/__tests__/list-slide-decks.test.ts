import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlideDeck } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { listSlideDecks } from '../list-slide-decks';

const createDeck = (id: string, createdBy: string): SlideDeck =>
  ({
    id,
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

describe('listSlideDecks', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('lists slide decks for the current user', async () => {
    const user = createTestUser();
    const listSpy = vi.fn().mockReturnValue(
      Effect.succeed([
        createDeck('sld_1', user.id),
        createDeck('sld_2', user.id),
      ] as SlideDeck[]),
    );

    const repo = createMockSlideDeckRepo({
      list: listSpy,
    });

    const result = await Effect.runPromise(
      withTestUser(user)(
        listSlideDecks({ limit: 25 }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo)),
        ),
      ),
    );

    expect(result).toHaveLength(2);
    expect(listSpy).toHaveBeenCalledWith({
      createdBy: user.id,
      limit: 25,
      offset: undefined,
    });
  });
});
