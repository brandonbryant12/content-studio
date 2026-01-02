import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  createTestPodcastScript,
  resetPodcastCounters,
  resetAllFactories,
  DEFAULT_TEST_SEGMENTS,
} from '@repo/testing';
import type { Podcast, PodcastScript } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { ScriptNotFound } from '../../../errors';
import {
  ScriptVersionRepo,
  type ScriptVersionRepoService,
} from '../../repos/script-version-repo';
import { getActiveScript } from '../get-active-script';

// =============================================================================
// Test Setup
// =============================================================================

interface MockRepoState {
  versions: PodcastScript[];
}

/**
 * Create a mock ScriptVersionRepo layer with custom behavior.
 */
const createMockScriptVersionRepo = (
  state: MockRepoState,
): Layer.Layer<ScriptVersionRepo> => {
  const service: ScriptVersionRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    deactivateAll: () => Effect.die('not implemented'),
    getNextVersion: () => Effect.die('not implemented'),

    findActiveByPodcastId: (podcastId: string) =>
      Effect.succeed(
        state.versions.find(
          (v) => v.podcastId === podcastId && v.isActive,
        ) ?? null,
      ),
  };

  return Layer.succeed(ScriptVersionRepo, service);
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

describe('getActiveScript', () => {
  beforeEach(() => {
    resetPodcastCounters();
    resetAllFactories();
  });

  describe('successful retrieval', () => {
    it('returns active script when it exists', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const version = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: true,
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
        summary: 'Test summary',
      });

      const mockRepo = createMockScriptVersionRepo({ versions: [version] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.id).toBe(version.id);
      expect(result.podcastId).toBe(podcast.id);
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('ready');
      expect(result.segments).toEqual(DEFAULT_TEST_SEGMENTS);
      expect(result.summary).toBe('Test summary');
    });

    it('returns script with drafting status', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const version = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: true,
        status: 'drafting',
      });

      const mockRepo = createMockScriptVersionRepo({ versions: [version] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.status).toBe('drafting');
      // Note: drafting status may still have segments from the factory
      expect(result.isActive).toBe(true);
    });

    it('returns script with script_ready status', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const version = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: true,
        status: 'script_ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      const mockRepo = createMockScriptVersionRepo({ versions: [version] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.status).toBe('script_ready');
      expect(result.segments).not.toBeNull();
    });

    it('returns script with audio URL when ready', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const version = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: true,
        status: 'ready',
        audioUrl: 'https://storage.example.com/audio.wav',
        duration: 300,
      });

      const mockRepo = createMockScriptVersionRepo({ versions: [version] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.status).toBe('ready');
      expect(result.audioUrl).toBe('https://storage.example.com/audio.wav');
      expect(result.duration).toBe(300);
    });
  });

  describe('multiple versions', () => {
    it('returns only the active version among multiple versions', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const inactiveVersion1 = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: false,
        version: 1,
        status: 'ready',
      });
      const activeVersion = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: true,
        version: 2,
        status: 'drafting',
      });
      const inactiveVersion2 = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: false,
        version: 3,
        status: 'failed',
      });

      const mockRepo = createMockScriptVersionRepo({
        versions: [inactiveVersion1, activeVersion, inactiveVersion2],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.id).toBe(activeVersion.id);
      expect(result.version).toBe(2);
      expect(result.isActive).toBe(true);
    });

    it('returns correct active script for specific podcast', async () => {
      const user = createTestUser();
      const podcast1 = createTestPodcast({ createdBy: user.id });
      const podcast2 = createTestPodcast({ createdBy: user.id });
      const version1 = createTestPodcastScript({
        podcastId: podcast1.id,
        isActive: true,
        summary: 'Podcast 1 script',
      });
      const version2 = createTestPodcastScript({
        podcastId: podcast2.id,
        isActive: true,
        summary: 'Podcast 2 script',
      });

      const mockRepo = createMockScriptVersionRepo({
        versions: [version1, version2],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast1.id }).pipe(Effect.provide(layers)),
      );

      expect(result.id).toBe(version1.id);
      expect(result.summary).toBe('Podcast 1 script');
    });
  });

  describe('error handling', () => {
    it('fails with ScriptNotFound when no active version exists', async () => {
      const podcastId = 'pod_noversion';

      const mockRepo = createMockScriptVersionRepo({ versions: [] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        getActiveScript({ podcastId }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ScriptNotFound);
        expect((error as ScriptNotFound).podcastId).toBe(podcastId);
        expect((error as ScriptNotFound).message).toBe('No active script found');
      }
    });

    it('fails with ScriptNotFound when only inactive versions exist', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const inactiveVersion = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: false,
        status: 'ready',
      });

      const mockRepo = createMockScriptVersionRepo({
        versions: [inactiveVersion],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ScriptNotFound);
      }
    });

    it('fails when versions exist for different podcast only', async () => {
      const user = createTestUser();
      const podcast1 = createTestPodcast({ createdBy: user.id });
      const podcast2 = createTestPodcast({ createdBy: user.id });
      const version = createTestPodcastScript({
        podcastId: podcast1.id,
        isActive: true,
      });

      const mockRepo = createMockScriptVersionRepo({ versions: [version] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      // Query for podcast2, but version belongs to podcast1
      const result = await Effect.runPromiseExit(
        getActiveScript({ podcastId: podcast2.id }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ScriptNotFound);
        expect((error as ScriptNotFound).podcastId).toBe(podcast2.id);
      }
    });
  });

  describe('script content', () => {
    it('returns script with generation prompt', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const version = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: true,
        generationPrompt: 'Create a casual podcast about technology',
      });

      const mockRepo = createMockScriptVersionRepo({ versions: [version] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.generationPrompt).toBe(
        'Create a casual podcast about technology',
      );
    });

    it('returns script with error message for failed generation', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const version = createTestPodcastScript({
        podcastId: podcast.id,
        isActive: true,
        status: 'failed',
        errorMessage: 'LLM rate limit exceeded',
      });

      const mockRepo = createMockScriptVersionRepo({ versions: [version] });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        getActiveScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('LLM rate limit exceeded');
    });
  });
});
