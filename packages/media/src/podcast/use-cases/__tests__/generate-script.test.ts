import { createMockLLM } from '@repo/ai/testing';
import { createMockStorage } from '@repo/storage/testing';
import {
  createTestUser,
  createTestPodcast,
  createTestSource,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PodcastWithSources } from '../../repos/podcast-repo';
import type { Podcast, Persona } from '@repo/db/schema';
import {
  createMockPodcastRepo,
  createMockPersonaRepo,
  createMockSourceRepo,
  createMockActivityLogRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { generateScript } from '../generate-script';

vi.mock('../../../source', () => ({
  getSourceContent: ({ id }: { id: string }) =>
    Effect.succeed({ content: `Content for ${id}` }),
}));

const buildTestPersona = (
  userId: string,
  id: string,
  name: string,
  role: string,
  personalityDescription: string,
  speakingStyle: string,
  exampleQuotes: string[],
): Persona => ({
  id: id as Persona['id'],
  name,
  role,
  personalityDescription,
  speakingStyle,
  exampleQuotes,
  voiceId: null,
  voiceName: null,
  avatarStorageKey: null,
  createdBy: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('generateScript', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('generates a script and updates the podcast', async () => {
    const user = createTestUser();
    const doc = createTestSource({ createdBy: user.id });
    const podcast = {
      ...createTestPodcast({ createdBy: user.id }),
      sources: [doc],
    } as unknown as PodcastWithSources;

    const updateStatusSpy = vi.fn();
    const updateScriptSpy = vi.fn();
    const updateSpy = vi.fn();

    const repo = createMockPodcastRepo({
      findByIdForUser: () => Effect.succeed(podcast),
      updateStatus: (id, status) =>
        Effect.sync(() => {
          updateStatusSpy(id, status);
          return { ...podcast, status } as unknown as Podcast;
        }),
      updateScript: (id, data) =>
        Effect.sync(() => {
          updateScriptSpy(id, data);
          return { ...podcast, ...data } as unknown as Podcast;
        }),
      update: (id, data) =>
        Effect.sync(() => {
          updateSpy(id, data);
          return { ...podcast, ...data } as unknown as Podcast;
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
      createMockSourceRepo(),
      createMockActivityLogRepo(),
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

  it('includes the approved episode plan in the generation prompt', async () => {
    const user = createTestUser();
    const doc = createTestSource({ createdBy: user.id });
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        episodePlan: {
          angle: 'Focus on rollout lessons.',
          openingHook: 'Most launches fail in the handoff.',
          closingTakeaway: 'Start with one workflow.',
          sections: [
            {
              heading: 'Why teams stall',
              summary: 'Operational gaps that block execution.',
              keyPoints: ['Ownership drift', 'Weak source quality'],
              sourceIds: [doc.id],
              estimatedMinutes: 2,
            },
          ],
        },
      }),
      sources: [doc],
    } as unknown as PodcastWithSources;

    const updateScriptSpy = vi.fn();

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockPodcastRepo({
        findByIdForUser: () => Effect.succeed(podcast),
        updateStatus: (_id, status) =>
          Effect.succeed({ ...podcast, status } as unknown as Podcast),
        updateScript: (id, data) =>
          Effect.sync(() => {
            updateScriptSpy(id, data);
            return { ...podcast, ...data } as unknown as Podcast;
          }),
        update: (_id, data) =>
          Effect.succeed({ ...podcast, ...data } as unknown as Podcast),
      }),
      createMockPersonaRepo(),
      createMockSourceRepo(),
      createMockActivityLogRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      createMockLLM({
        response: {
          title: 'Generated Title',
          description: 'Generated Description',
          summary: 'Generated Summary',
          tags: ['tag-a'],
          segments: [{ speaker: 'host', line: 'Hello world' }],
        },
      }),
    );

    await Effect.runPromise(
      withTestUser(user)(
        generateScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(updateScriptSpy).toHaveBeenCalledWith(
      podcast.id,
      expect.objectContaining({
        generationPrompt: expect.stringContaining(
          'Source materials remain the ground truth',
        ),
      }),
    );
  });

  it('passes persona context and target duration into final script generation', async () => {
    const user = createTestUser();
    const doc = createTestSource({ createdBy: user.id });
    const hostPersonaId = 'per_host1234567890';
    const coHostPersonaId = 'per_cohost1234567';
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        hostPersonaId: hostPersonaId as Podcast['hostPersonaId'],
        coHostPersonaId: coHostPersonaId as Podcast['coHostPersonaId'],
        targetDurationMinutes: 12,
      }),
      sources: [doc],
    } as unknown as PodcastWithSources;

    const updateScriptSpy = vi.fn();

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockPodcastRepo({
        findByIdForUser: () => Effect.succeed(podcast),
        updateStatus: (_id, status) =>
          Effect.succeed({ ...podcast, status } as unknown as Podcast),
        updateScript: (id, data) =>
          Effect.sync(() => {
            updateScriptSpy(id, data);
            return { ...podcast, ...data } as unknown as Podcast;
          }),
        update: (_id, data) =>
          Effect.succeed({ ...podcast, ...data } as unknown as Podcast),
      }),
      createMockPersonaRepo({
        findById: (id) =>
          Effect.succeed(
            id === hostPersonaId
              ? buildTestPersona(
                  user.id,
                  id,
                  'Avery Stone',
                  'Host',
                  'Direct and practical',
                  'Measured and clear',
                  ['Lets break this down.'],
                )
              : buildTestPersona(
                  user.id,
                  id,
                  'Jordan Vale',
                  'Co-Host',
                  'Curious and skeptical',
                  'Energetic and probing',
                  ['Why does that matter?'],
                ),
          ),
      }),
      createMockSourceRepo(),
      createMockActivityLogRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      createMockLLM({
        response: {
          title: 'Generated Title',
          description: 'Generated Description',
          summary: 'Generated Summary',
          tags: ['tag-a'],
          segments: [{ speaker: 'host', line: 'Hello world' }],
        },
      }),
    );

    await Effect.runPromise(
      withTestUser(user)(
        generateScript({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(updateScriptSpy).toHaveBeenCalledWith(
      podcast.id,
      expect.objectContaining({
        generationPrompt: expect.stringContaining(
          'Target runtime: about 12 minutes',
        ),
      }),
    );
    expect(updateScriptSpy).toHaveBeenCalledWith(
      podcast.id,
      expect.objectContaining({
        generationPrompt: expect.stringContaining(
          '## Host Character: "Avery Stone"',
        ),
      }),
    );
    expect(updateScriptSpy).toHaveBeenCalledWith(
      podcast.id,
      expect.objectContaining({
        generationPrompt: expect.stringContaining(
          '## Co-Host Character: "Jordan Vale"',
        ),
      }),
    );
  });

  it('can skip a saved episode plan for quick-start generation', async () => {
    const user = createTestUser();
    const doc = createTestSource({ createdBy: user.id });
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        episodePlan: {
          angle: 'Focus on rollout lessons.',
          openingHook: 'Most launches fail in the handoff.',
          closingTakeaway: 'Start with one workflow.',
          sections: [
            {
              heading: 'Why teams stall',
              summary: 'Operational gaps that block execution.',
              keyPoints: ['Ownership drift', 'Weak source quality'],
              sourceIds: [doc.id],
              estimatedMinutes: 2,
            },
          ],
        },
      }),
      sources: [doc],
    } as unknown as PodcastWithSources;

    const updateScriptSpy = vi.fn();

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockPodcastRepo({
        findByIdForUser: () => Effect.succeed(podcast),
        updateStatus: (_id, status) =>
          Effect.succeed({ ...podcast, status } as unknown as Podcast),
        updateScript: (id, data) =>
          Effect.sync(() => {
            updateScriptSpy(id, data);
            return { ...podcast, ...data } as unknown as Podcast;
          }),
        update: (_id, data) =>
          Effect.succeed({ ...podcast, ...data } as unknown as Podcast),
      }),
      createMockPersonaRepo(),
      createMockSourceRepo(),
      createMockActivityLogRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      createMockLLM({
        response: {
          title: 'Generated Title',
          description: 'Generated Description',
          summary: 'Generated Summary',
          tags: ['tag-a'],
          segments: [{ speaker: 'host', line: 'Hello world' }],
        },
      }),
    );

    await Effect.runPromise(
      withTestUser(user)(
        generateScript({
          podcastId: podcast.id,
          promptInstructions: 'Stay concise.',
          ignoreEpisodePlan: true,
        }).pipe(Effect.provide(layers)),
      ),
    );

    expect(updateScriptSpy).toHaveBeenCalledWith(
      podcast.id,
      expect.objectContaining({
        generationPrompt: expect.not.stringContaining(
          '# Approved Episode Plan',
        ),
      }),
    );
  });
});
