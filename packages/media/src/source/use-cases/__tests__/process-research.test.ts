import {
  DeepResearch,
  ResearchError,
  type DeepResearchService,
} from '@repo/ai';
import { createMockLLM } from '@repo/ai/testing';
import {
  SourceStatus,
  generateJobId,
  type ResearchConfig,
} from '@repo/db/schema';
import { Queue, type QueueService } from '@repo/queue';
import { createMockStorage } from '@repo/storage/testing';
import {
  createTestSource,
  createTestPodcast,
  createTestUser,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockActivityLogRepo,
  createMockSourceRepo,
  createMockInfographicRepo,
  createMockPodcastRepo,
  createMockVoiceoverRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { type SourceRepoService } from '../../repos';
import { processResearch, ResearchTimeoutError } from '../process-research';

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

const mockSourceRepo = (overrides: Partial<SourceRepoService>) =>
  createMockSourceRepo({
    updateResearchConfig: () => Effect.succeed({} as never),
    ...overrides,
  });

const mockOutlineLLM = () =>
  createMockLLM({
    response: {
      title: 'Research Outline',
      sections: [
        {
          heading: 'Key Findings',
          summary: 'Summary of the most relevant findings.',
          citations: ['https://example.com/reference'],
        },
      ],
    },
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
    it('skips startResearch when source has existing operationId with in_progress status', async () => {
      const startResearchSpy = vi.fn();
      const getResultSpy = vi.fn();

      const existingSource = createTestSource({
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
        createMockVoiceoverRepo(),
        createMockInfographicRepo(),
        createMockQueue(),
        mockSourceRepo({
          findById: () => Effect.succeed(existingSource),
          updateContent: () => Effect.succeed(existingSource),
          updateStatus: () => Effect.succeed(existingSource),
        }),
        createMockActivityLogRepo(),
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
        mockOutlineLLM(),
      );

      await Effect.runPromise(
        withTestUser(testUser)(
          processResearch({
            sourceId: existingSource.id,
            query: 'test query',
          }).pipe(Effect.provide(layers)),
        ),
      );

      // startResearch should NOT be called — we resume
      expect(startResearchSpy).not.toHaveBeenCalled();
      // getResult should be called with the existing operation ID
      expect(getResultSpy).toHaveBeenCalledWith('existing-op-123');
    });

    it('starts fresh research when source has no operationId', async () => {
      const startResearchSpy = vi.fn();

      const doc = createTestSource({
        source: 'research',
        status: 'processing',
        researchConfig: { query: 'test query' },
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(),
        createMockVoiceoverRepo(),
        createMockInfographicRepo(),
        createMockQueue(),
        mockSourceRepo({
          findById: () => Effect.succeed(doc),
          updateContent: () => Effect.succeed(doc),
          updateStatus: () => Effect.succeed(doc),
        }),
        createMockActivityLogRepo(),
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
        mockOutlineLLM(),
      );

      await Effect.runPromise(
        withTestUser(testUser)(
          processResearch({ sourceId: doc.id, query: 'test query' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(startResearchSpy).toHaveBeenCalledWith('test query');
    });

    it('starts fresh research when researchStatus is not in_progress', async () => {
      const startResearchSpy = vi.fn();

      const doc = createTestSource({
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
        createMockVoiceoverRepo(),
        createMockInfographicRepo(),
        createMockQueue(),
        mockSourceRepo({
          findById: () => Effect.succeed(doc),
          updateContent: () => Effect.succeed(doc),
          updateStatus: () => Effect.succeed(doc),
        }),
        createMockActivityLogRepo(),
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
        mockOutlineLLM(),
      );

      await Effect.runPromise(
        withTestUser(testUser)(
          processResearch({ sourceId: doc.id, query: 'test query' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      // Should start fresh since researchStatus was 'failed'
      expect(startResearchSpy).toHaveBeenCalledWith('test query');
    });

    it('does not set researchConfig to in_progress when resuming', async () => {
      const configUpdates: Array<{ id: string; config: unknown }> = [];

      const existingSource = createTestSource({
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
        createMockVoiceoverRepo(),
        createMockInfographicRepo(),
        createMockQueue(),
        mockSourceRepo({
          findById: () => Effect.succeed(existingSource),
          updateContent: () => Effect.succeed(existingSource),
          updateStatus: () => Effect.succeed(existingSource),
          updateResearchConfig: (id, config) => {
            configUpdates.push({ id, config });
            return Effect.succeed(existingSource);
          },
        }),
        createMockActivityLogRepo(),
        createMockDeepResearch({
          getResult: () =>
            Effect.succeed({
              content: 'Result',
              sources: [],
              wordCount: 1,
            }),
        }),
        createMockStorage(),
        mockOutlineLLM(),
      );

      await Effect.runPromise(
        withTestUser(testUser)(
          processResearch({
            sourceId: existingSource.id,
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

  describe('timeout ownership', () => {
    it('fails with use-case-owned ResearchTimeoutError and timeout payload', async () => {
      vi.useFakeTimers();
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      try {
        const doc = createTestSource({
          source: 'research',
          status: 'processing',
          researchConfig: { query: 'test query' },
        });
        const configUpdates: Array<{
          operationId?: string;
          researchStatus?: string;
        }> = [];
        const statusUpdates: Array<{
          status: SourceStatus;
          message?: string;
        }> = [];

        const layers = Layer.mergeAll(
          MockDbLive,
          createMockPodcastRepo(),
          createMockVoiceoverRepo(),
          createMockInfographicRepo(),
          createMockQueue(),
          mockSourceRepo({
            findById: () => Effect.succeed(doc),
            updateResearchConfig: (_id, config) =>
              Effect.sync(() => {
                configUpdates.push(config);
                return doc;
              }),
            updateStatus: (_id, status, message) =>
              Effect.sync(() => {
                statusUpdates.push({ status, message });
                return doc;
              }),
          }),
          createMockActivityLogRepo(),
          createMockDeepResearch({
            startResearch: () =>
              Effect.succeed({ interactionId: 'op-timeout-123' }),
            getResult: () => Effect.succeed(null),
          }),
          createMockStorage(),
          mockOutlineLLM(),
        );

        const resultExit = Effect.runPromiseExit(
          withTestUser(testUser)(
            processResearch({ sourceId: doc.id, query: 'test query' }).pipe(
              Effect.provide(layers),
            ),
          ),
        );

        await vi.advanceTimersByTimeAsync(3_700_000);
        const result = await resultExit;

        expect(result._tag).toBe('Failure');
        if (result._tag === 'Failure') {
          const error =
            result.cause._tag === 'Fail' ? result.cause.error : null;
          expect(error?._tag).toBe('ResearchTimeoutError');
          if (error?._tag === 'ResearchTimeoutError') {
            expect(error.sourceId).toBe(doc.id);
            expect(error.interactionId).toBe('op-timeout-123');
          }
        }

        expect(ResearchTimeoutError.httpCode).toBe('SOURCE_RESEARCH_TIMEOUT');
        expect(configUpdates).toContainEqual(
          expect.objectContaining({
            operationId: 'op-timeout-123',
            researchStatus: 'failed',
          }),
        );
        expect(statusUpdates).toContainEqual({
          status: SourceStatus.FAILED,
          message: 'Research timed out after 60 minutes',
        });
      } finally {
        consoleLogSpy.mockRestore();
        vi.useRealTimers();
      }
    });
  });

  describe('error handling', () => {
    it('marks research config as failed when provider polling errors', async () => {
      const doc = createTestSource({
        source: 'research',
        status: 'processing',
        researchConfig: {
          query: 'test query',
          operationId: 'existing-op-123',
          researchStatus: 'in_progress',
        },
      });

      const researchConfigUpdates: ResearchConfig[] = [];
      const statusUpdates: Array<{
        status: SourceStatus;
        message?: string;
      }> = [];

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(),
        createMockVoiceoverRepo(),
        createMockInfographicRepo(),
        createMockQueue(),
        mockSourceRepo({
          findById: () => Effect.succeed(doc),
          updateResearchConfig: (_id, config) =>
            Effect.sync(() => {
              researchConfigUpdates.push(config);
              return doc;
            }),
          updateStatus: (_id, status, message) =>
            Effect.sync(() => {
              statusUpdates.push({ status, message });
              return doc;
            }),
        }),
        createMockActivityLogRepo(),
        createMockDeepResearch({
          getResult: () =>
            Effect.fail(
              new ResearchError({
                message: 'Research operation was cancelled',
              }),
            ),
        }),
        createMockStorage(),
        mockOutlineLLM(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(testUser)(
          processResearch({
            sourceId: doc.id,
            query: 'test query',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      expect(researchConfigUpdates).toContainEqual(
        expect.objectContaining({
          query: 'test query',
          operationId: 'existing-op-123',
          researchStatus: 'failed',
        }),
      );
      expect(statusUpdates).toContainEqual({
        status: SourceStatus.FAILED,
        message: 'Research operation was cancelled',
      });
    });
  });

  describe('auto podcast generation', () => {
    it('creates and queues a default podcast when autoGeneratePodcast is enabled', async () => {
      const user = createTestUser();
      const enqueueSpy = vi.fn();
      const insertSpy = vi.fn();

      const doc = createTestSource({
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
        sourceIds: [doc.id],
        status: 'drafting',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        mockSourceRepo({
          findById: () => Effect.succeed(doc),
          updateContent: () => Effect.succeed(doc),
          updateStatus: () => Effect.succeed(doc),
        }),
        createMockActivityLogRepo(),
        createMockPodcastRepo({
          verifySourcesExist: () => Effect.succeed([doc]),
          insert: (data, sourceIds) =>
            Effect.sync(() => {
              insertSpy(data, sourceIds);
              podcast = createTestPodcast({
                id: podcast.id,
                createdBy: data.createdBy,
                title: data.title ?? podcast.title,
                format: data.format,
                sourceIds: [...sourceIds],
                status: podcast.status,
                targetDurationMinutes: data.targetDurationMinutes ?? 5,
                hostVoice: data.hostVoice ?? null,
                hostVoiceName: data.hostVoiceName ?? null,
                coHostVoice: data.coHostVoice ?? null,
                coHostVoiceName: data.coHostVoiceName ?? null,
              });
              return { ...podcast, sources: [doc] };
            }),
          findByIdForUser: () => Effect.succeed({ ...podcast, sources: [doc] }),
          updateStatus: (_id, status) =>
            Effect.sync(() => {
              podcast = { ...podcast, status };
              return podcast;
            }),
          clearApproval: () => Effect.succeed(podcast),
        }),
        createMockVoiceoverRepo(),
        createMockInfographicRepo(),
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
        mockOutlineLLM(),
      );

      await Effect.runPromise(
        withTestUser(user)(
          processResearch({ sourceId: doc.id, query: 'test query' }).pipe(
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
