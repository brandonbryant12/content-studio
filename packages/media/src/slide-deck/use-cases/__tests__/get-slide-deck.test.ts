import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SlideDeck } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { getSlideDeck } from '../get-slide-deck';

const slideDeckFixture = (createdBy: string): SlideDeck =>
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

describe('getSlideDeck', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns a slide deck scoped to the current user', async () => {
    const user = createTestUser();
    const slideDeck = slideDeckFixture(user.id);

    const repo = createMockSlideDeckRepo({
      findByIdForUser: () => Effect.succeed(slideDeck),
    });

    const result = await Effect.runPromise(
      withTestUser(user)(
        getSlideDeck({ id: slideDeck.id }).pipe(
          Effect.provide(Layer.mergeAll(MockDbLive, repo)),
        ),
      ),
    );

    expect(result.id).toBe(slideDeck.id);
    expect(result.createdBy).toBe(user.id);
  });
});
