import { createMockLLM } from '@repo/ai/testing';
import { createMockStorage } from '@repo/storage/testing';
import {
  createTestUser,
  createTestPodcast,
  createTestDocument,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PodcastWithDocuments } from '../../repos/podcast-repo';
import type { Podcast } from '@repo/db/schema';
import {
  createMockPodcastRepo,
  createMockPersonaRepo,
  createMockDocumentRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { generateScript } from '../generate-script';

vi.mock('../../../document', () => ({
  getDocumentContent: ({ id }: { id: string }) =>
    Effect.succeed({ content: `Content for ${id}` }),
}));

describe('generateScript', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('generates a script and updates the podcast', async () => {
    const user = createTestUser();
    const doc = createTestDocument({ createdBy: user.id });
    const podcast = {
      ...createTestPodcast({ createdBy: user.id }),
      documents: [doc],
    } satisfies PodcastWithDocuments;

    const updateStatusSpy = vi.fn();
    const updateScriptSpy = vi.fn();
    const updateSpy = vi.fn();

    const repo = createMockPodcastRepo({
      findByIdForUser: () => Effect.succeed(podcast),
      updateStatus: (id, status) =>
        Effect.sync(() => {
          updateStatusSpy(id, status);
          return { ...podcast, status } as Podcast;
        }),
      updateScript: (id, data) =>
        Effect.sync(() => {
          updateScriptSpy(id, data);
          return { ...podcast, ...data } as Podcast;
        }),
      update: (id, data) =>
        Effect.sync(() => {
          updateSpy(id, data);
          return { ...podcast, ...data } as Podcast;
        }),
    });

    const llmResponse = {
      title: 'Generated Title',
      description: 'Generated Description',
      summary: 'Generated Summary',
      tags: ['tag-a', 'tag-b'],
      segments: [
        { speaker: 'host', line: 'Hello world' },
        { speaker: 'cohost', line: 'Thanks for having me' },
      ],
    };

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockPersonaRepo(),
      createMockDocumentRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      createMockLLM({ response: llmResponse }),
    );

    const result = await Effect.runPromise(
      withTestUser(user)(
        generateScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      podcast.id,
      'generating_script',
    );
    expect(updateStatusSpy).toHaveBeenCalledWith(podcast.id, 'script_ready');
    expect(updateScriptSpy).toHaveBeenCalledWith(podcast.id, {
      segments: [
        { speaker: 'host', line: 'Hello world', index: 0 },
        { speaker: 'cohost', line: 'Thanks for having me', index: 1 },
      ],
      summary: 'Generated Summary',
      generationPrompt: expect.any(String),
    });
    expect(updateSpy).toHaveBeenCalledWith(podcast.id, {
      title: 'Generated Title',
      description: 'Generated Description',
      tags: ['tag-a', 'tag-b'],
    });
    expect(result.segmentCount).toBe(2);
  });
});
