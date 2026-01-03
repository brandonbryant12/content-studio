import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  createTestDocument,
  resetPodcastCounters,
  resetAllFactories,
} from '@repo/testing';
import type { Podcast, Document } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import { deletePodcast } from '../delete-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockRepoState {
  podcasts: Map<string, Podcast>;
  documents: Document[];
}

/**
 * Create a mock PodcastRepo layer with custom behavior.
 */
const createMockPodcastRepo = (
  state: MockRepoState,
  options?: {
    onDelete?: (id: string) => void;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    findByIdFull: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApprovals: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.get(id);
        if (!podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        const docs = state.documents.filter((d) =>
          podcast.sourceDocumentIds.includes(d.id),
        );
        const result: PodcastWithDocuments = {
          ...podcast,
          documents: docs,
        };
        return Effect.succeed(result);
      }),

    delete: (id: string) =>
      Effect.sync(() => {
        options?.onDelete?.(id);
        const existed = state.podcasts.has(id);
        state.podcasts.delete(id);
        return existed;
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

describe('deletePodcast', () => {
  beforeEach(() => {
    resetPodcastCounters();
    resetAllFactories();
  });

  describe('successful deletion', () => {
    it('deletes podcast when it exists', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);
      const deleteCalls: string[] = [];

      const mockRepo = createMockPodcastRepo(
        { podcasts, documents: [] },
        { onDelete: (id) => deleteCalls.push(id) },
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromise(
        deletePodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(deleteCalls).toContain(podcast.id);
      expect(podcasts.has(podcast.id)).toBe(false);
    });

    it('deletes podcast with associated documents (documents remain)', async () => {
      const user = createTestUser();
      const doc = createTestDocument({ createdBy: user.id });
      const podcast = createTestPodcast({
        createdBy: user.id,
        sourceDocumentIds: [doc.id],
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);
      const deleteCalls: string[] = [];

      const mockRepo = createMockPodcastRepo(
        { podcasts, documents: [doc] },
        { onDelete: (id) => deleteCalls.push(id) },
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromise(
        deletePodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      // Podcast should be deleted
      expect(deleteCalls).toContain(podcast.id);
      expect(podcasts.has(podcast.id)).toBe(false);
    });

    it('returns void on successful deletion', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        deletePodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result).toBeUndefined();
    });
  });

  describe('verification before deletion', () => {
    it('verifies podcast exists before deleting', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);
      const findByIdCalls: string[] = [];
      const deleteCalls: string[] = [];

      const service: PodcastRepoService = {
        insert: () => Effect.die('not implemented'),
        findByIdFull: () => Effect.die('not implemented'),
        list: () => Effect.die('not implemented'),
        update: () => Effect.die('not implemented'),
        count: () => Effect.die('not implemented'),
        verifyDocumentsExist: () => Effect.die('not implemented'),
        updateGenerationContext: () => Effect.die('not implemented'),
        updateStatus: () => Effect.die('not implemented'),
        updateScript: () => Effect.die('not implemented'),
        updateAudio: () => Effect.die('not implemented'),
        clearAudio: () => Effect.die('not implemented'),
        clearApprovals: () => Effect.die('not implemented'),
        findById: (id: string) =>
          Effect.suspend(() => {
            findByIdCalls.push(id);
            const pod = podcasts.get(id);
            if (!pod) {
              return Effect.fail(new PodcastNotFound({ id }));
            }
            return Effect.succeed({ ...pod, documents: [] });
          }),
        delete: (id: string) =>
          Effect.sync(() => {
            deleteCalls.push(id);
            podcasts.delete(id);
            return true;
          }),
      };

      const mockRepo = Layer.succeed(PodcastRepo, service);
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromise(
        deletePodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      // findById should be called first to verify existence
      expect(findByIdCalls).toContain(podcast.id);
      // Then delete should be called
      expect(deleteCalls).toContain(podcast.id);
      // Order check: findById should come before delete
      expect(findByIdCalls.indexOf(podcast.id)).toBeLessThanOrEqual(
        deleteCalls.indexOf(podcast.id),
      );
    });
  });

  describe('error handling', () => {
    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const nonExistentId = 'pod_nonexistent';
      const podcasts = new Map<string, Podcast>();

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        deletePodcast({ podcastId: nonExistentId }).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
        expect((error as PodcastNotFound).id).toBe(nonExistentId);
      }
    });

    it('does not call delete when podcast not found', async () => {
      const nonExistentId = 'pod_nonexistent';
      const podcasts = new Map<string, Podcast>();
      const deleteCalls: string[] = [];

      const mockRepo = createMockPodcastRepo(
        { podcasts, documents: [] },
        { onDelete: (id) => deleteCalls.push(id) },
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromiseExit(
        deletePodcast({ podcastId: nonExistentId }).pipe(
          Effect.provide(layers),
        ),
      );

      // Delete should not be called when findById fails
      expect(deleteCalls).toHaveLength(0);
    });
  });

  describe('multiple podcasts', () => {
    it('only deletes the specified podcast', async () => {
      const user = createTestUser();
      const podcast1 = createTestPodcast({ createdBy: user.id });
      const podcast2 = createTestPodcast({ createdBy: user.id });
      const podcast3 = createTestPodcast({ createdBy: user.id });
      const podcasts = new Map<string, Podcast>([
        [podcast1.id, podcast1],
        [podcast2.id, podcast2],
        [podcast3.id, podcast3],
      ]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromise(
        deletePodcast({ podcastId: podcast2.id }).pipe(Effect.provide(layers)),
      );

      // Only podcast2 should be deleted
      expect(podcasts.has(podcast1.id)).toBe(true);
      expect(podcasts.has(podcast2.id)).toBe(false);
      expect(podcasts.has(podcast3.id)).toBe(true);
    });
  });
});
