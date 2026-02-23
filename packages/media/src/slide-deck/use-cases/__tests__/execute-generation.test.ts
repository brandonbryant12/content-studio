import { createMockLLM } from '@repo/ai/testing';
import { createMockStorage } from '@repo/storage/testing';
import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Document, SlideDeck, SlideDeckVersion } from '@repo/db/schema';
import { createMockDocumentRepo, MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSlideDeckRepo } from '../../../test-utils/mock-slide-deck-repo';
import { executeSlideDeckGeneration } from '../execute-generation';

const createDocument = (id: string, createdBy: string): Document =>
  ({
    id,
    title: 'Source Document',
    contentKey: `documents/${id}.txt`,
    mimeType: 'text/plain',
    wordCount: 10,
    source: 'manual',
    originalFileName: null,
    originalFileSize: null,
    metadata: null,
    status: 'ready',
    errorMessage: null,
    sourceUrl: null,
    researchConfig: null,
    jobId: null,
    extractedText: 'Market growth increased 12% year over year.',
    contentHash: null,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as Document;

const createSlideDeck = (
  createdBy: string,
  sourceDocumentIds: string[] = ['doc_a'],
): SlideDeck =>
  ({
    id: 'sld_test0000000001',
    title: 'Q1 Review',
    prompt: 'Summarize business performance',
    sourceDocumentIds,
    theme: 'executive',
    slides: [],
    generatedHtml: null,
    status: 'generating',
    errorMessage: null,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as SlideDeck;

const createVersion = (
  deckId: string,
  versionNumber: number,
): SlideDeckVersion =>
  ({
    id: 'sldv_test0000000001',
    slideDeckId: deckId,
    versionNumber,
    prompt: null,
    sourceDocumentIds: [],
    theme: 'executive',
    slides: [],
    generatedHtml: '<html></html>',
    createdAt: new Date(),
  }) as unknown as SlideDeckVersion;

describe('executeSlideDeckGeneration', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('generates and persists a new slide deck version', async () => {
    const user = createTestUser();
    const deck = createSlideDeck(user.id);
    const document = createDocument(deck.sourceDocumentIds[0]!, user.id);
    const insertVersionSpy = vi.fn();
    const updateSpy = vi.fn();
    const deleteOldVersionsSpy = vi.fn();

    const repo = createMockSlideDeckRepo({
      findById: () => Effect.succeed(deck),
      listVersions: () => Effect.succeed([] as readonly SlideDeckVersion[]),
      insertVersion: (input) => {
        insertVersionSpy(input);
        return Effect.succeed(createVersion(input.slideDeckId, input.versionNumber));
      },
      update: (id, data) => {
        updateSpy(id, data);
        return Effect.succeed({ ...deck, ...data } as SlideDeck);
      },
      deleteOldVersions: (id, keepCount) => {
        deleteOldVersionsSpy(id, keepCount);
        return Effect.succeed(0);
      },
    });

    const documentRepo = createMockDocumentRepo({
      findByIdForUser: () => Effect.succeed(document),
    });

    const llm = createMockLLM({
      response: {
        title: 'Q1 Business Review',
        slides: [
          {
            title: 'Highlights',
            body: 'Key outcomes from the quarter',
            bullets: [' Revenue +12% ', '  ', 'Margin expansion'],
          },
        ],
      },
    });

    const result = await Effect.runPromise(
      withTestUser(user)(
        executeSlideDeckGeneration({ slideDeckId: deck.id }).pipe(
          Effect.provide(
            Layer.mergeAll(
              MockDbLive,
              repo,
              documentRepo,
              llm,
              createMockStorage(),
            ),
          ),
        ),
      ),
    );

    expect(result.slideDeckId).toBe(deck.id);
    expect(result.versionNumber).toBe(1);
    expect(result.slideCount).toBe(1);
    expect(insertVersionSpy).toHaveBeenCalledTimes(1);
    expect(insertVersionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        slideDeckId: deck.id,
        versionNumber: 1,
        theme: 'executive',
        generatedHtml: expect.stringContaining('<!doctype html>'),
        slides: [
          expect.objectContaining({
            id: 'slide-1',
            title: 'Highlights',
            layout: 'title_bullets',
            bullets: ['Revenue +12%', 'Margin expansion'],
          }),
        ],
      }),
    );
    expect(updateSpy).toHaveBeenCalledWith(
      deck.id,
      expect.objectContaining({
        title: 'Q1 Business Review',
        status: 'ready',
        errorMessage: null,
        generatedHtml: expect.stringContaining('<!doctype html>'),
      }),
    );
    expect(deleteOldVersionsSpy).toHaveBeenCalledWith(deck.id, 10);
  });

  it('marks the deck as failed when generation errors', async () => {
    const user = createTestUser();
    const deck = createSlideDeck(user.id, []);
    const updateSpy = vi.fn();

    const repo = createMockSlideDeckRepo({
      findById: () => Effect.succeed(deck),
      update: (id, data) => {
        updateSpy(id, data);
        return Effect.succeed({ ...deck, ...data } as SlideDeck);
      },
    });

    const exit = await Effect.runPromiseExit(
      withTestUser(user)(
        executeSlideDeckGeneration({ slideDeckId: deck.id }).pipe(
          Effect.provide(
            Layer.mergeAll(
              MockDbLive,
              repo,
              createMockDocumentRepo(),
              createMockLLM({ errorMessage: 'LLM unavailable' }),
              createMockStorage(),
            ),
          ),
        ),
      ),
    );

    expect(exit._tag).toBe('Failure');
    expect(updateSpy).toHaveBeenCalledWith(deck.id, {
      status: 'failed',
      errorMessage: 'Slide generation failed. Please try again.',
    });
  });
});
