import { DeepResearch, type DeepResearchService } from '@repo/ai';
import { createMockStorage } from '@repo/storage/testing';
import { createTestDocument, resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockDocumentRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { type DocumentRepoService } from '../../repos';
import { processResearch } from '../process-research';

// =============================================================================
// Test Helpers
// =============================================================================

const createMockDeepResearch = (
  overrides: Partial<DeepResearchService> = {},
): Layer.Layer<DeepResearch> => {
  const defaults: DeepResearchService = {
    startResearch: () => Effect.die('not implemented'),
    getResult: () => Effect.die('not implemented'),
  };
  return Layer.succeed(DeepResearch, { ...defaults, ...overrides });
};

const mockDocRepo = (overrides: Partial<DocumentRepoService>) =>
  createMockDocumentRepo({
    updateResearchConfig: () => Effect.succeed({} as never),
    ...overrides,
  });

// =============================================================================
// Tests
// =============================================================================

describe('processResearch', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('resume branch', () => {
    it('skips startResearch when document has existing operationId with in_progress status', async () => {
      const startResearchSpy = vi.fn();
      const getResultSpy = vi.fn();

      const existingDoc = createTestDocument({
        source: 'research',
        status: 'processing',
        researchConfig: {
          query: 'test query',
          operationId: 'existing-op-123',
          researchStatus: 'in_progress',
        },
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        mockDocRepo({
          findById: () => Effect.succeed(existingDoc),
          updateContent: () => Effect.succeed(existingDoc),
          updateStatus: () => Effect.succeed(existingDoc),
        }),
        createMockDeepResearch({
          startResearch: (query) => {
            startResearchSpy(query);
            return Effect.succeed({ interactionId: 'new-op-456' });
          },
          getResult: (id) => {
            getResultSpy(id);
            return Effect.succeed({
              content: 'Research result content here',
              sources: [{ title: 'Source 1', url: 'https://example.com' }],
              wordCount: 5,
            });
          },
        }),
        createMockStorage(),
      );

      await Effect.runPromise(
        processResearch({
          documentId: existingDoc.id,
          query: 'test query',
        }).pipe(Effect.provide(layers)),
      );

      // startResearch should NOT be called — we resume
      expect(startResearchSpy).not.toHaveBeenCalled();
      // getResult should be called with the existing operation ID
      expect(getResultSpy).toHaveBeenCalledWith('existing-op-123');
    });

    it('starts fresh research when document has no operationId', async () => {
      const startResearchSpy = vi.fn();

      const doc = createTestDocument({
        source: 'research',
        status: 'processing',
        researchConfig: { query: 'test query' },
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        mockDocRepo({
          findById: () => Effect.succeed(doc),
          updateContent: () => Effect.succeed(doc),
          updateStatus: () => Effect.succeed(doc),
        }),
        createMockDeepResearch({
          startResearch: (query) => {
            startResearchSpy(query);
            return Effect.succeed({ interactionId: 'new-op-789' });
          },
          getResult: () =>
            Effect.succeed({
              content: 'Fresh research result',
              sources: [],
              wordCount: 3,
            }),
        }),
        createMockStorage(),
      );

      await Effect.runPromise(
        processResearch({ documentId: doc.id, query: 'test query' }).pipe(
          Effect.provide(layers),
        ),
      );

      expect(startResearchSpy).toHaveBeenCalledWith('test query');
    });

    it('starts fresh research when researchStatus is not in_progress', async () => {
      const startResearchSpy = vi.fn();

      const doc = createTestDocument({
        source: 'research',
        status: 'processing',
        researchConfig: {
          query: 'test query',
          operationId: 'old-op-111',
          researchStatus: 'failed',
        },
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        mockDocRepo({
          findById: () => Effect.succeed(doc),
          updateContent: () => Effect.succeed(doc),
          updateStatus: () => Effect.succeed(doc),
        }),
        createMockDeepResearch({
          startResearch: (query) => {
            startResearchSpy(query);
            return Effect.succeed({ interactionId: 'new-op-222' });
          },
          getResult: () =>
            Effect.succeed({
              content: 'New research result',
              sources: [],
              wordCount: 3,
            }),
        }),
        createMockStorage(),
      );

      await Effect.runPromise(
        processResearch({ documentId: doc.id, query: 'test query' }).pipe(
          Effect.provide(layers),
        ),
      );

      // Should start fresh since researchStatus was 'failed'
      expect(startResearchSpy).toHaveBeenCalledWith('test query');
    });

    it('does not set researchConfig to in_progress when resuming', async () => {
      const configUpdates: Array<{ id: string; config: unknown }> = [];

      const existingDoc = createTestDocument({
        source: 'research',
        status: 'processing',
        researchConfig: {
          query: 'test query',
          operationId: 'existing-op-123',
          researchStatus: 'in_progress',
        },
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        mockDocRepo({
          findById: () => Effect.succeed(existingDoc),
          updateContent: () => Effect.succeed(existingDoc),
          updateStatus: () => Effect.succeed(existingDoc),
          updateResearchConfig: (id, config) => {
            configUpdates.push({ id, config });
            return Effect.succeed(existingDoc);
          },
        }),
        createMockDeepResearch({
          getResult: () =>
            Effect.succeed({
              content: 'Result',
              sources: [],
              wordCount: 1,
            }),
        }),
        createMockStorage(),
      );

      await Effect.runPromise(
        processResearch({
          documentId: existingDoc.id,
          query: 'test query',
        }).pipe(Effect.provide(layers)),
      );

      // updateResearchConfig should only be called for completion, not for the initial in_progress
      for (const { config } of configUpdates) {
        const c = config as { researchStatus?: string };
        expect(c.researchStatus).not.toBe('in_progress');
      }
    });
  });
});
