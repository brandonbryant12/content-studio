import { Db } from '@repo/db/effect';
import {
  createTestUser,
  createTestPodcast,
  createTestSource,
  resetPodcastCounters,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Podcast, Source, CreatePodcast, SourceId } from '@repo/db/schema';
import { SourceNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithSources,
} from '../../repos/podcast-repo';
import { createPodcast } from '../create-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockRepoState {
  sources: Source[];
  insertedPodcast?: Podcast;
}

/**
 * Create a mock PodcastRepo layer with custom behavior.
 */
const createMockPodcastRepo = (
  state: MockRepoState,
  options?: {
    onInsert?: (
      data: Omit<CreatePodcast, 'sourceIds'> & { createdBy: string },
      sourceIds: readonly string[],
    ) => void;
    verifySourcesError?: SourceNotFound;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    findByIdForUser(id, _userId) {
      return this.findById(id);
    },
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),
    setApproval: () => Effect.die('not implemented'),

    insert: (data, sourceIds) =>
      Effect.sync(() => {
        options?.onInsert?.(data, sourceIds);
        const podcast =
          state.insertedPodcast ??
          createTestPodcast({
            title: data.title,
            description: data.description,
            format: data.format,
            hostVoice: data.hostVoice,
            coHostVoice: data.coHostVoice,
            promptInstructions: data.promptInstructions,
            targetDurationMinutes: data.targetDurationMinutes,
            createdBy: data.createdBy,
            sourceIds: [...sourceIds],
          });
        const docs = state.sources.filter((d) => sourceIds.includes(d.id));
        const result: PodcastWithSources = {
          ...podcast,
          sources: docs,
        };
        return result;
      }),

    verifySourcesExist: (sourceIds, _userId) =>
      Effect.suspend(() => {
        if (options?.verifySourcesError) {
          return Effect.fail(options.verifySourcesError);
        }
        const docs = state.sources.filter((d) => sourceIds.includes(d.id));
        return Effect.succeed(docs);
      }),
  };

  return Layer.succeed(PodcastRepo, service);
};

/**
 * Create a mock Db layer.
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

// =============================================================================
// Tests
// =============================================================================

describe('createPodcast', () => {
  beforeEach(() => {
    resetPodcastCounters();
    resetAllFactories();
  });

  describe('podcast creation', () => {
    it('creates podcast with correct metadata', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const mockPodcastRepo = createMockPodcastRepo(
        { sources: [] },
        { onInsert: insertSpy },
      );
      const layers = Layer.mergeAll(MockDbLive, mockPodcastRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createPodcast({
            format: 'conversation',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.format).toBe('conversation');
      expect(insertSpy).toHaveBeenCalledOnce();
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'conversation',
          createdBy: user.id,
        }),
        [],
      );
    });

    it('creates podcast with custom settings', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const mockPodcastRepo = createMockPodcastRepo(
        { sources: [] },
        { onInsert: insertSpy },
      );
      const layers = Layer.mergeAll(MockDbLive, mockPodcastRepo);

      await Effect.runPromise(
        withTestUser(user)(
          createPodcast({
            format: 'conversation',
            title: 'Custom Title',
            description: 'Custom Description',
            hostVoice: 'Puck',
            coHostVoice: 'Aoede',
            promptInstructions: 'Be casual',
            targetDurationMinutes: 15,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'conversation',
          title: 'Custom Title',
          description: 'Custom Description',
          hostVoice: 'Puck',
          coHostVoice: 'Aoede',
          promptInstructions: 'Be casual',
          targetDurationMinutes: 15,
          createdBy: user.id,
        }),
        [],
      );
    });
  });

  describe('source handling', () => {
    it('creates podcast with source IDs', async () => {
      const user = createTestUser();
      const doc1 = createTestSource({ createdBy: user.id });
      const doc2 = createTestSource({ createdBy: user.id });
      const insertSpy = vi.fn();

      const mockPodcastRepo = createMockPodcastRepo(
        { sources: [doc1, doc2] },
        { onInsert: insertSpy },
      );
      const layers = Layer.mergeAll(MockDbLive, mockPodcastRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createPodcast({
            format: 'conversation',
            sourceIds: [doc1.id, doc2.id],
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.sources).toHaveLength(2);
      expect(insertSpy).toHaveBeenCalledWith(expect.anything(), [
        doc1.id,
        doc2.id,
      ]);
    });

    it('verifies sources exist before creating podcast', async () => {
      const user = createTestUser();
      const doc = createTestSource({ createdBy: user.id });
      const verifyError = new SourceNotFound({ id: 'doc_missing' });

      const mockPodcastRepo = createMockPodcastRepo(
        { sources: [doc] },
        { verifySourcesError: verifyError },
      );
      const layers = Layer.mergeAll(MockDbLive, mockPodcastRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          createPodcast({
            format: 'conversation',
            sourceIds: ['doc_missing' as SourceId],
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe('doc_missing');
      }
    });

    it('skips source verification when no sourceIds provided', async () => {
      const user = createTestUser();

      const mockPodcastRepo = createMockPodcastRepo({ sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockPodcastRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createPodcast({
            format: 'conversation',
          }).pipe(Effect.provide(layers)),
        ),
      );

      // Should succeed without source verification
      expect(result.sources).toHaveLength(0);
    });
  });

  describe('initial status', () => {
    it('creates podcast with drafting status', async () => {
      const user = createTestUser();

      const mockPodcastRepo = createMockPodcastRepo({ sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockPodcastRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createPodcast({
            format: 'conversation',
          }).pipe(Effect.provide(layers)),
        ),
      );

      // Status is now directly on the podcast (flattened schema)
      expect(result.status).toBe('drafting');
    });
  });
});
