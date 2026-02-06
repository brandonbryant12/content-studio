import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
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
import { getPodcast } from '../get-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockRepoState {
  podcasts: Podcast[];
  documents: Document[];
}

/**
 * Create a mock PodcastRepo layer with custom behavior.
 */
const createMockPodcastRepo = (
  state: MockRepoState,
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApprovals: () => Effect.die('not implemented'),
    setOwnerApproval: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.find((p) => p.id === id);
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

  };

  return Layer.succeed(PodcastRepo, service);
};

/**
 * Create a mock Db layer (required by use case signature but not used when repo is mocked).
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

// =============================================================================
// Tests
// =============================================================================

describe('getPodcast', () => {
  beforeEach(() => {
    resetPodcastCounters();
    resetAllFactories();
  });

  describe('basic retrieval', () => {
    it('returns podcast with documents when found', async () => {
      const user = createTestUser();
      const doc = createTestDocument({ createdBy: user.id });
      const podcast = createTestPodcast({
        title: 'My Podcast',
        createdBy: user.id,
        sourceDocumentIds: [doc.id],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        documents: [doc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.title).toBe('My Podcast');
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]!.id).toBe(doc.id);
    });

    it('returns podcast without documents by default', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        documents: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.status).toBe('ready');
    });

    it('returns podcast with documents when includeDocuments is true', async () => {
      const user = createTestUser();
      const doc = createTestDocument({ createdBy: user.id });
      const podcast = createTestPodcast({
        createdBy: user.id,
        sourceDocumentIds: [doc.id],
        status: 'ready',
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        documents: [doc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getPodcast({ podcastId: podcast.id, includeDocuments: true }).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.status).toBe('ready');
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]!.id).toBe(doc.id);
    });

    it('returns podcast with status from the podcast directly', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'generating_script',
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        documents: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getPodcast({ podcastId: podcast.id, includeDocuments: true }).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.status).toBe('generating_script');
    });
  });

  describe('documents resolution', () => {
    it('returns podcast with multiple documents in order', async () => {
      const user = createTestUser();
      const doc1 = createTestDocument({ createdBy: user.id, title: 'Doc 1' });
      const doc2 = createTestDocument({ createdBy: user.id, title: 'Doc 2' });
      const doc3 = createTestDocument({ createdBy: user.id, title: 'Doc 3' });
      const podcast = createTestPodcast({
        createdBy: user.id,
        sourceDocumentIds: [doc1.id, doc2.id, doc3.id],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        documents: [doc1, doc2, doc3],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.documents).toHaveLength(3);
    });

    it('returns podcast with empty documents array when no source documents', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        sourceDocumentIds: [],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        documents: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.documents).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const nonExistentId = 'pod_nonexistent';

      const mockRepo = createMockPodcastRepo({
        podcasts: [],
        documents: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        getPodcast({ podcastId: nonExistentId }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
        expect((error as PodcastNotFound).id).toBe(nonExistentId);
      }
    });

    it('fails with PodcastNotFound when includeDocuments is true and podcast does not exist', async () => {
      const nonExistentId = 'pod_nonexistent';

      const mockRepo = createMockPodcastRepo({
        podcasts: [],
        documents: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        getPodcast({ podcastId: nonExistentId, includeDocuments: true }).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
      }
    });
  });
});
