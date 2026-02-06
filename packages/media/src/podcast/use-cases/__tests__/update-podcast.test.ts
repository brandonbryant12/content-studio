import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  createTestDocument,
  resetPodcastCounters,
  resetAllFactories,
} from '@repo/testing';
import type { Podcast, Document, UpdatePodcast } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import { updatePodcast } from '../update-podcast';

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
    onUpdate?: (id: string, data: UpdatePodcast) => void;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
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

    update: (id: string, data: UpdatePodcast) =>
      Effect.suspend(() => {
        const existing = state.podcasts.get(id);
        if (!existing) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        options?.onUpdate?.(id, data);
        const updated: Podcast = {
          ...existing,
          title: data.title ?? existing.title,
          description: data.description ?? existing.description,
          hostVoice: data.hostVoice ?? existing.hostVoice,
          hostVoiceName: data.hostVoiceName ?? existing.hostVoiceName,
          coHostVoice: data.coHostVoice ?? existing.coHostVoice,
          coHostVoiceName: data.coHostVoiceName ?? existing.coHostVoiceName,
          promptInstructions:
            data.promptInstructions ?? existing.promptInstructions,
          targetDurationMinutes:
            data.targetDurationMinutes ?? existing.targetDurationMinutes,
          tags: data.tags ? [...data.tags] : existing.tags,
          sourceDocumentIds: data.documentIds
            ? ([...data.documentIds] as Podcast['sourceDocumentIds'])
            : existing.sourceDocumentIds,
          updatedAt: new Date(),
        };
        state.podcasts.set(id, updated);
        return Effect.succeed(updated);
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

describe('updatePodcast', () => {
  beforeEach(() => {
    resetPodcastCounters();
    resetAllFactories();
  });

  describe('basic updates', () => {
    it('updates podcast title', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        title: 'Original Title',
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { title: 'Updated Title' },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.title).toBe('Updated Title');
    });

    it('updates podcast description', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        description: 'Original description',
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { description: 'New description' },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.description).toBe('New description');
    });
  });

  describe('voice settings', () => {
    it('updates host voice settings', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        hostVoice: 'Charon',
        hostVoiceName: 'Charon',
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { hostVoice: 'Puck', hostVoiceName: 'Puck' },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.hostVoice).toBe('Puck');
      expect(result.hostVoiceName).toBe('Puck');
    });

    it('updates co-host voice settings', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        coHostVoice: 'Kore',
        coHostVoiceName: 'Kore',
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { coHostVoice: 'Aoede', coHostVoiceName: 'Aoede' },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.coHostVoice).toBe('Aoede');
      expect(result.coHostVoiceName).toBe('Aoede');
    });
  });

  describe('generation settings', () => {
    it('updates prompt instructions', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        promptInstructions: null,
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { promptInstructions: 'Be casual and fun' },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.promptInstructions).toBe('Be casual and fun');
    });

    it('updates target duration', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        targetDurationMinutes: 5,
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { targetDurationMinutes: 15 },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.targetDurationMinutes).toBe(15);
    });
  });

  describe('tags and documents', () => {
    it('updates tags', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        tags: ['old-tag'],
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, documents: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { tags: ['new-tag-1', 'new-tag-2'] },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.tags).toEqual(['new-tag-1', 'new-tag-2']);
    });

    it('updates document IDs', async () => {
      const user = createTestUser();
      const doc1 = createTestDocument({ createdBy: user.id });
      const doc2 = createTestDocument({ createdBy: user.id });
      const podcast = createTestPodcast({
        sourceDocumentIds: [doc1.id],
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({
        podcasts,
        documents: [doc1, doc2],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: { documentIds: [doc2.id] },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.sourceDocumentIds).toEqual([doc2.id]);
    });
  });

  describe('multiple field updates', () => {
    it('updates multiple fields at once', async () => {
      const user = createTestUser();
      const updateSpy = vi.fn();
      const podcast = createTestPodcast({
        title: 'Original',
        description: 'Original description',
        format: 'conversation',
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo(
        { podcasts, documents: [] },
        { onUpdate: updateSpy },
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        updatePodcast({
          podcastId: podcast.id,
          data: {
            title: 'New Title',
            description: 'New description',
            targetDurationMinutes: 20,
          },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New description');
      expect(result.targetDurationMinutes).toBe(20);

      expect(updateSpy).toHaveBeenCalledOnce();
      expect(updateSpy).toHaveBeenCalledWith(
        podcast.id,
        expect.objectContaining({
          title: 'New Title',
          description: 'New description',
          targetDurationMinutes: 20,
        }),
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
        updatePodcast({
          podcastId: nonExistentId,
          data: { title: 'Should Fail' },
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
        expect((error as PodcastNotFound).id).toBe(nonExistentId);
      }
    });
  });
});
