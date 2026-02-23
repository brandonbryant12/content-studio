import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlideDeck } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { updateSlideDeck } from '../update-slide-deck';

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

describe('updateSlideDeck', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('updates deck fields after ownership check', async () => {
    const user = createTestUser();
    const deck = createDeck(user.id);
    const updateSpy = vi.fn().mockReturnValue(
      Effect.succeed({
        ...deck,
        title: 'Updated Deck',
      } as SlideDeck),
    );

    const repo = createMockSlideDeckRepo({
      findByIdForUser: () => Effect.succeed(deck),
      update: updateSpy,
    });

    const result = await Effect.runPromise(
      withTestUser(user)(
        updateSlideDeck({
          id: deck.id,
          title: 'Updated Deck',
          sourceDocumentIds: [' doc_1 ', 'doc_2'],
          slides: [
            {
              id: 'slide-1',
              title: 'Intro',
              bullets: [' one ', ''],
            },
          ],
        }).pipe(Effect.provide(Layer.mergeAll(MockDbLive, repo))),
      ),
    );

    expect(result.title).toBe('Updated Deck');
    expect(updateSpy).toHaveBeenCalledWith(deck.id, {
      title: 'Updated Deck',
      prompt: undefined,
      sourceDocumentIds: ['doc_1', 'doc_2'],
      theme: undefined,
      slides: [
        {
          id: 'slide-1',
          title: 'Intro',
          body: undefined,
          notes: undefined,
          imageUrl: undefined,
          bullets: ['one'],
          sourceDocumentIds: undefined,
          layout: 'title_bullets',
        },
      ],
    });
  });
});
