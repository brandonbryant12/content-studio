import { DeepResearch, type DeepResearchService } from '@repo/ai';
import { generateJobId } from '@repo/db/schema';
import { Queue, type QueueService } from '@repo/queue';
import { createMockStorage } from '@repo/storage/testing';
import {
  createTestDocument,
  createTestPodcast,
  createTestUser,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockDocumentRepo,
  createMockPodcastRepo,
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

const createMockQueue = (overrides: Partial<QueueService> = {}) =>
  Layer.succeed(Queue, {
    enqueue: () => Effect.die('not implemented'),
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    claimNextJob: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
    failStaleJobs: () => Effect.die('not implemented'),
    ...overrides,
  } satisfies QueueService);

// =============================================================================
// Tests
// =============================================================================

describe('processResearch', () => {
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    resetAllFactories();
    testUser = createTestUser();
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
        createMockPodcastRepo(),
        createMockQueue(),
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
        withTestUser(testUser)(
          processResearch({
            documentId: existingDoc.id,
            query: 'test query',
          }).pipe(Effect.provide(layers)),
        ),
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
        createMockPodcastRepo(),
        createMockQueue(),
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
        withTestUser(testUser)(
          processResearch({ documentId: doc.id, query: 'test query' }).pipe(
            Effect.provide(layers),
          ),
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
        createMockPodcastRepo(),
        createMockQueue(),
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
        withTestUser(testUser)(
          processResearch({ documentId: doc.id, query: 'test query' }).pipe(
            Effect.provide(layers),
          ),
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
        createMockPodcastRepo(),
        createMockQueue(),
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
        withTestUser(testUser)(
          processResearch({
            documentId: existingDoc.id,
            query: 'test query',
          }).pipe(Effect.provide(layers)),
        ),
      );

      // updateResearchConfig should only be called for completion, not for the initial in_progress
      for (const { config } of configUpdates) {
        const c = config as { researchStatus?: string };
        expect(c.researchStatus).not.toBe('in_progress');
      }
    });
  });

  describe('auto podcast generation', () => {
    it('creates and queues a default podcast when autoGeneratePodcast is enabled', async () => {
      const user = createTestUser();
      const enqueueSpy = vi.fn();
      const insertSpy = vi.fn();

      const doc = createTestDocument({
        createdBy: user.id,
        source: 'research',
        status: 'processing',
        researchConfig: {
          query: 'test query',
          autoGeneratePodcast: true,
        },
      });

      let podcast = createTestPodcast({
        createdBy: user.id,
        sourceDocumentIds: [doc.id],
        status: 'drafting',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        mockDocRepo({
          findById: () => Effect.succeed(doc),
          updateContent: () => Effect.succeed(doc),
          updateStatus: () => Effect.succeed(doc),
        }),
        createMockPodcastRepo({
          verifyDocumentsExist: () => Effect.succeed([doc]),
          insert: (data, documentIds) =>
            Effect.sync(() => {
              insertSpy(data, documentIds);
              podcast = createTestPodcast({
                id: podcast.id,
                createdBy: data.createdBy,
                title: data.title ?? podcast.title,
                format: data.format,
                sourceDocumentIds: [...documentIds],
                status: podcast.status,
                targetDurationMinutes: data.targetDurationMinutes ?? 5,
                hostVoice: data.hostVoice ?? null,
                hostVoiceName: data.hostVoiceName ?? null,
                coHostVoice: data.coHostVoice ?? null,
                coHostVoiceName: data.coHostVoiceName ?? null,
              });
              return { ...podcast, documents: [doc] };
            }),
          findByIdForUser: () =>
            Effect.succeed({ ...podcast, documents: [doc] }),
          updateStatus: (_id, status) =>
            Effect.sync(() => {
              podcast = { ...podcast, status };
              return podcast;
            }),
          clearApproval: () => Effect.succeed(podcast),
        }),
        createMockQueue({
          findPendingJobForPodcast: () => Effect.succeed(null),
          enqueue: (type, payload, createdBy) =>
            Effect.sync(() => {
              enqueueSpy(type, payload, createdBy);
              return {
                id: generateJobId(),
                type,
                status: 'pending',
                payload,
                result: null,
                error: null,
                createdBy,
                createdAt: new Date(),
                updatedAt: new Date(),
                startedAt: null,
                completedAt: null,
              };
            }),
        }),
        createMockDeepResearch({
          startResearch: () => Effect.succeed({ interactionId: 'op-auto' }),
          getResult: () =>
            Effect.succeed({
              content: 'Research result content',
              sources: [],
              wordCount: 3,
            }),
        }),
        createMockStorage(),
      );

      await Effect.runPromise(
        withTestUser(user)(
          processResearch({ documentId: doc.id, query: 'test query' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(insertSpy.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          format: 'conversation',
          targetDurationMinutes: 5,
          hostVoice: 'Aoede',
          hostVoiceName: 'Aoede',
          coHostVoice: 'Charon',
          coHostVoiceName: 'Charon',
        }),
      );
      expect(insertSpy.mock.calls[0]?.[1]).toEqual([doc.id]);

      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy.mock.calls[0]?.[0]).toBe('generate-podcast');
      expect(enqueueSpy.mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({
          podcastId: podcast.id,
          userId: user.id,
        }),
      );
    });
  });
});
