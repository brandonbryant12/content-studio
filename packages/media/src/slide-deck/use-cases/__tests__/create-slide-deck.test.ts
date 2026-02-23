import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SlideDeck, SlideDeckTheme } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { createSlideDeck } from '../create-slide-deck';

const makeDeck = (
  data: {
    id: string;
    title: string;
    prompt?: string;
    sourceDocumentIds?: string[];
    theme: SlideDeckTheme;
    slides?: SlideDeck['slides'];
    status?: SlideDeck['status'];
    createdBy: string;
  },
): SlideDeck =>
  ({
    ...data,
    prompt: data.prompt ?? null,
    sourceDocumentIds: data.sourceDocumentIds ?? [],
    slides: data.slides ?? [],
    generatedHtml: null,
    status: data.status ?? 'draft',
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as SlideDeck;

describe('createSlideDeck', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('creates a slide deck with sanitized source document ids', async () => {
    const user = createTestUser();
    const repo = createMockSlideDeckRepo({
      insert: (data) =>
        Effect.succeed(
          makeDeck({
            ...data,
            id: data.id as string,
            sourceDocumentIds: data.sourceDocumentIds,
          }),
        ),
    });

    const result = await Effect.runPromise(
      withTestUser(user)(
        createSlideDeck({
          title: 'Quarterly Review',
          sourceDocumentIds: [' doc_1 ', '', 'doc_1', 'doc_2'],
          theme: 'executive',
        }).pipe(Effect.provide(Layer.mergeAll(MockDbLive, repo))),
      ),
    );

    expect(result.title).toBe('Quarterly Review');
    expect(result.sourceDocumentIds).toEqual(['doc_1', 'doc_2']);
    expect(result.theme).toBe('executive');
  });
});
