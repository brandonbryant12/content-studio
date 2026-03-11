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
import type { Podcast, Source, UpdatePodcast } from '@repo/db/schema';
import { PodcastNotFound, SourceNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithSources,
} from '../../repos/podcast-repo';
import { updatePodcast } from '../update-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockRepoState {
  podcasts: Map<string, Podcast>;
  sources: Source[];
}

/**
 * Create a mock PodcastRepo layer with custom behavior.
 */
const createMockPodcastRepo = (
  state: MockRepoState,
  options?: {
    onUpdate?: (id: string, data: UpdatePodcast) => void;
    verifySourcesError?: SourceNotFound;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifySourcesExist: (sourceIds, userId) =>
      Effect.suspend(() => {
        if (options?.verifySourcesError) {
          return Effect.fail(options.verifySourcesError);
        }

        const docs = state.sources.filter((d) => sourceIds.includes(d.id));
        const foundIds = new Set(docs.map((doc) => doc.id));
        const missingId = sourceIds.find(
          (sourceId) => !foundIds.has(sourceId as Source['id']),
        );
        if (missingId) {
          return Effect.fail(new SourceNotFound({ id: missingId }));
        }

        const notOwned = docs.find((doc) => doc.createdBy !== userId);
        if (notOwned) {
          return Effect.fail(
            new SourceNotFound({
              id: notOwned.id,
              message: 'Source not found or access denied',
            }),
          );
        }

        return Effect.succeed(docs);
      }),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),
    setApproval: () => Effect.die('not implemented'),

    findByIdForUser: (id: string, userId: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.get(id);
        if (!podcast || podcast.createdBy !== userId) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        const docs = state.sources.filter((d) =>
          podcast.sourceIds.includes(d.id),
        );
        const result: PodcastWithSources = {
          ...podcast,
          sources: docs,
        };
        return Effect.succeed(result);
      }),
    findById: (id: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.get(id);
        if (!podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        const docs = state.sources.filter((d) =>
          podcast.sourceIds.includes(d.id),
        );
        const result: PodcastWithSources = {
          ...podcast,
          sources: docs,
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
          setupInstructions:
            data.setupInstructions === undefined
              ? existing.setupInstructions
              : data.setupInstructions,
          promptInstructions:
            data.promptInstructions ?? existing.promptInstructions,
          episodePlan:
            data.episodePlan === undefined
              ? existing.episodePlan
              : data.episodePlan,
          targetDurationMinutes:
            data.targetDurationMinutes ?? existing.targetDurationMinutes,
          tags: data.tags ? [...data.tags] : existing.tags,
          sourceIds: data.sourceIds
            ? ([...data.sourceIds] as Podcast['sourceIds'])
            : existing.sourceIds,
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

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { title: 'Updated Title' },
          }).pipe(Effect.provide(layers)),
        ),
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

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { description: 'New description' },
          }).pipe(Effect.provide(layers)),
        ),
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

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { hostVoice: 'Puck', hostVoiceName: 'Puck' },
          }).pipe(Effect.provide(layers)),
        ),
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

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { coHostVoice: 'Aoede', coHostVoiceName: 'Aoede' },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.coHostVoice).toBe('Aoede');
      expect(result.coHostVoiceName).toBe('Aoede');
    });
  });

  describe('generation settings', () => {
    it('updates and trims setup instructions', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        setupInstructions: null,
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { setupInstructions: '  Focus on payment options.  ' },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.setupInstructions).toBe('Focus on payment options.');
    });

    it('updates prompt instructions', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        promptInstructions: null,
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { promptInstructions: 'Be casual and fun' },
          }).pipe(Effect.provide(layers)),
        ),
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

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { targetDurationMinutes: 10 },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.targetDurationMinutes).toBe(10);
    });

    it('sanitizes episode plans before persistence', async () => {
      const user = createTestUser();
      const doc = createTestSource({ createdBy: user.id });
      const podcast = createTestPodcast({
        sourceIds: [doc.id],
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({
        podcasts,
        sources: [doc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: {
              episodePlan: {
                angle: '  Focus on the rollout lessons.  ',
                openingHook: '  Most launches fail before users hear them.  ',
                closingTakeaway: '  Start smaller and tighten feedback.  ',
                sections: [
                  {
                    heading: '  Where teams stall  ',
                    summary:
                      '  The operational bottlenecks that slow launch.  ',
                    keyPoints: ['  approvals  ', ' ', 'approvals', 'source QA'],
                    sourceIds: [doc.id, 'doc_unknown'],
                    estimatedMinutes: 1.3,
                  },
                  {
                    heading: '   ',
                    summary: 'This section should be dropped',
                    keyPoints: ['ignored'],
                    sourceIds: [doc.id],
                    estimatedMinutes: 2,
                  },
                ],
              },
            },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.episodePlan).toEqual({
        angle: 'Focus on the rollout lessons.',
        openingHook: 'Most launches fail before users hear them.',
        closingTakeaway: 'Start smaller and tighten feedback.',
        sections: [
          {
            heading: 'Where teams stall',
            summary: 'The operational bottlenecks that slow launch.',
            keyPoints: ['approvals', 'source QA'],
            sourceIds: [doc.id],
            estimatedMinutes: 1,
          },
        ],
      });
    });
  });

  describe('tags and sources', () => {
    it('updates tags', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        tags: ['old-tag'],
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { tags: ['new-tag-1', 'new-tag-2'] },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.tags).toEqual(['new-tag-1', 'new-tag-2']);
    });

    it('updates source IDs', async () => {
      const user = createTestUser();
      const doc1 = createTestSource({ createdBy: user.id });
      const doc2 = createTestSource({ createdBy: user.id, wordCount: 2400 });
      const podcast = {
        ...createTestPodcast({
          sourceIds: [doc1.id],
          createdBy: user.id,
        }),
        hostVoice: null,
        hostVoiceName: null,
        coHostVoice: null,
        coHostVoiceName: null,
      };
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({
        podcasts,
        sources: [doc1, doc2],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { sourceIds: [doc2.id] },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.sourceIds).toEqual([doc2.id]);
      expect(result.targetDurationMinutes).toBe(4);
    });

    it('keeps an explicit target duration when sources change', async () => {
      const user = createTestUser();
      const doc1 = createTestSource({ createdBy: user.id, wordCount: 400 });
      const doc2 = createTestSource({ createdBy: user.id, wordCount: 4200 });
      const podcast = createTestPodcast({
        sourceIds: [doc1.id],
        targetDurationMinutes: 8,
        hostVoice: 'Aoede',
        createdBy: user.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({
        podcasts,
        sources: [doc1, doc2],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: { sourceIds: [doc2.id] },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.targetDurationMinutes).toBe(8);
    });

    it('fails when updated source IDs are not owned by the current user', async () => {
      const owner = createTestUser();
      const otherUser = createTestUser();
      const ownedDoc = createTestSource({ createdBy: owner.id });
      const foreignDoc = createTestSource({ createdBy: otherUser.id });
      const podcast = createTestPodcast({
        sourceIds: [ownedDoc.id],
        createdBy: owner.id,
      });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({
        podcasts,
        sources: [ownedDoc, foreignDoc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(owner)(
          updatePodcast({
            podcastId: podcast.id,
            data: { sourceIds: [foreignDoc.id] },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure' && result.cause._tag === 'Fail') {
        const error = result.cause.error;
        expect(error._tag).toBe('SourceNotFound');
        if (error._tag === 'SourceNotFound') {
          expect(error.id).toBe(foreignDoc.id);
        }
      }
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
        { podcasts, sources: [] },
        { onUpdate: updateSpy },
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updatePodcast({
            podcastId: podcast.id,
            data: {
              title: 'New Title',
              description: 'New description',
              targetDurationMinutes: 20,
            },
          }).pipe(Effect.provide(layers)),
        ),
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

  describe('authorization', () => {
    it('fails with PodcastNotFound when non-owner tries to update', async () => {
      const owner = createTestUser();
      const nonOwner = createTestUser();
      const podcast = createTestPodcast({ createdBy: owner.id });
      const podcasts = new Map<string, Podcast>([[podcast.id, podcast]]);

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(nonOwner)(
          updatePodcast({
            podcastId: podcast.id,
            data: { title: 'Should Fail' },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('PodcastNotFound');
        expect((error as PodcastNotFound).id).toBe(podcast.id);
      }
    });
  });

  describe('error handling', () => {
    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const user = createTestUser();
      const nonExistentId = 'pod_nonexistent';
      const podcasts = new Map<string, Podcast>();

      const mockRepo = createMockPodcastRepo({ podcasts, sources: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          updatePodcast({
            podcastId: nonExistentId,
            data: { title: 'Should Fail' },
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('PodcastNotFound');
        expect((error as PodcastNotFound).id).toBe(nonExistentId);
      }
    });
  });
});
