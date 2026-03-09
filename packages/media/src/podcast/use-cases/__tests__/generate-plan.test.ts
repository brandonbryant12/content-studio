import { LLM, type LLMService } from '@repo/ai/llm';
import { createMockLLM } from '@repo/ai/testing';
import { SourceStatus, type Podcast } from '@repo/db/schema';
import { createMockStorage } from '@repo/storage/testing';
import {
  createTestUser,
  createTestPodcast,
  createTestSource,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PodcastWithSources } from '../../repos/podcast-repo';
import {
  createMockPodcastRepo,
  createMockSourceRepo,
  MockDbLive,
} from '../../../test-utils';
import { createMockPersonaRepo } from '../../../test-utils/mock-repos';
import {
  generatePodcastPlan,
  type PodcastPlanSourcesNotReadyError,
} from '../generate-plan';

vi.mock('../../../source', () => ({
  getSourceContent: ({ id }: { id: string }) =>
    Effect.succeed({ content: `Content for ${id}` }),
}));

describe('generatePodcastPlan', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('generates and persists an episode plan', async () => {
    const user = createTestUser();
    const source = createTestSource({ createdBy: user.id });
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        sourceIds: [source.id],
      }),
      sources: [source],
    } as unknown as PodcastWithSources;

    const updateSpy = vi.fn();

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockPodcastRepo({
        findByIdForUser: () => Effect.succeed(podcast),
        update: (id, data) =>
          Effect.sync(() => {
            updateSpy(id, data);
            return { ...podcast, ...data } as unknown as Podcast;
          }),
      }),
      createMockSourceRepo(),
      createMockPersonaRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      createMockLLM({
        response: {
          angle: '  Focus on reliable rollout habits.  ',
          openingHook: '  AI projects often fail in the handoff.  ',
          closingTakeaway: '  Ship one workflow, then expand.  ',
          sections: [
            {
              heading: '  Launch blockers  ',
              summary: '  The patterns that derail delivery.  ',
              keyPoints: ['  Ownership gaps  ', 'Source quality'],
              sourceIds: [source.id, 'doc_unknown'],
              estimatedMinutes: 0,
            },
          ],
        },
      }),
    );

    const result = await Effect.runPromise(
      withTestUser(user)(
        generatePodcastPlan({ podcastId: podcast.id }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(updateSpy).toHaveBeenCalledWith(podcast.id, {
      episodePlan: {
        angle: 'Focus on reliable rollout habits.',
        openingHook: 'AI projects often fail in the handoff.',
        closingTakeaway: 'Ship one workflow, then expand.',
        sections: [
          {
            heading: 'Launch blockers',
            summary: 'The patterns that derail delivery.',
            keyPoints: ['Ownership gaps', 'Source quality'],
            sourceIds: [source.id],
          },
        ],
      },
    });
    expect(result.episodePlan?.sections).toHaveLength(1);
    expect(result.episodePlan?.sections[0]?.sourceIds).toEqual([source.id]);
  });

  it('passes quick-start setup directions into the planning prompt', async () => {
    const user = createTestUser();
    const source = createTestSource({ createdBy: user.id });
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        sourceIds: [source.id],
        setupInstructions: 'Keep the first section focused on bill anatomy.',
      }),
      sources: [source],
    } as unknown as PodcastWithSources;

    const generateSpy = vi.fn(({ prompt: _prompt }: { prompt: string }) =>
      Effect.succeed({
        object: {
          angle: 'Focus on utility billing basics.',
          openingHook: 'Most people never learn how to read the bill.',
          closingTakeaway: 'Start with the charges, then your payment options.',
          sections: [
            {
              heading: 'Reading the bill',
              summary: 'Explain the main bill sections.',
              keyPoints: ['Account basics', 'Charges', 'Due dates'],
              sourceIds: [source.id],
              estimatedMinutes: 2,
            },
          ],
        },
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
      }),
    );

    const llmService: LLMService = {
      generate: generateSpy as LLMService['generate'],
      streamText: () => Effect.die('not implemented'),
    };

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockPodcastRepo({
        findByIdForUser: () => Effect.succeed(podcast),
        update: (_id, data) =>
          Effect.succeed({ ...podcast, ...data } as unknown as Podcast),
      }),
      createMockSourceRepo(),
      createMockPersonaRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      Layer.succeed(LLM, llmService),
    );

    await Effect.runPromise(
      withTestUser(user)(
        generatePodcastPlan({ podcastId: podcast.id }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          'Keep the first section focused on bill anatomy.',
        ),
      }),
    );
  });

  it('uses target duration to guide planner section count without a fixed cap', async () => {
    const user = createTestUser();
    const source = createTestSource({ createdBy: user.id });
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        sourceIds: [source.id],
        targetDurationMinutes: 14,
      }),
      sources: [source],
    } as unknown as PodcastWithSources;

    const generateSpy = vi.fn(({ system: _system }: { system: string }) =>
      Effect.succeed({
        object: {
          angle: 'Focus on utility billing basics.',
          openingHook: 'Most people never learn how to read the bill.',
          closingTakeaway: 'Start with the charges, then your payment options.',
          sections: [
            {
              heading: 'Reading the bill',
              summary: 'Explain the main bill sections.',
              keyPoints: ['Account basics', 'Charges', 'Due dates'],
              sourceIds: [source.id],
              estimatedMinutes: 4,
            },
          ],
        },
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
      }),
    );

    const llmService: LLMService = {
      generate: generateSpy as LLMService['generate'],
      streamText: () => Effect.die('not implemented'),
    };

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockPodcastRepo({
        findByIdForUser: () => Effect.succeed(podcast),
        update: (_id, data) =>
          Effect.succeed({ ...podcast, ...data } as unknown as Podcast),
      }),
      createMockSourceRepo(),
      createMockPersonaRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      Layer.succeed(LLM, llmService),
    );

    await Effect.runPromise(
      withTestUser(user)(
        generatePodcastPlan({ podcastId: podcast.id }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          'Target total runtime: about 14 minutes',
        ),
      }),
    );
    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('There is no fixed section count.'),
      }),
    );
    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.not.stringContaining('Produce 3 to 5 sections'),
      }),
    );
  });

  it('fails when selected sources are still processing', async () => {
    const user = createTestUser();
    const source = createTestSource({
      createdBy: user.id,
      status: SourceStatus.PROCESSING,
    });
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        sourceIds: [source.id],
      }),
      sources: [source],
    } as unknown as PodcastWithSources;

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockPodcastRepo({
        findByIdForUser: () => Effect.succeed(podcast),
      }),
      createMockSourceRepo(),
      createMockPersonaRepo(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
      createMockLLM(),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        generatePodcastPlan({ podcastId: podcast.id }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure' && result.cause._tag === 'Fail') {
      expect(result.cause.error._tag).toBe('PodcastPlanSourcesNotReadyError');
      expect(
        (result.cause.error as PodcastPlanSourcesNotReadyError).sourceIds,
      ).toEqual([source.id]);
    }
  });
});
