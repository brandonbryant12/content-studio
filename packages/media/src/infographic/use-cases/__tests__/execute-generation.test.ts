import { createMockImageGen, createMockLLM } from '@repo/ai/testing';
import { Db } from '@repo/db/effect';
import { generateInfographicVersionId } from '@repo/db/schema';
import { createMockStorage } from '@repo/storage/testing';
import { createTestInfographic, resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Infographic, InfographicVersion } from '@repo/db/schema';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { createMockActivityLogRepo, MockDbLive } from '../../../test-utils/mock-repos';
import { executeInfographicGeneration } from '../execute-generation';

describe('executeInfographicGeneration', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('generates and saves a new infographic version', async () => {
    const infographic = createTestInfographic({
      title: 'Existing Title',
      status: 'generating',
    });

    const insertVersionSpy = vi.fn();
    const updateSpy = vi.fn();
    const deleteOldVersionsSpy = vi.fn();

    const repo = createMockInfographicRepo({
      findById: () => Effect.succeed(infographic),
      listVersions: () => Effect.succeed([] as InfographicVersion[]),
      insertVersion: (input) =>
        Effect.gen(function* () {
          yield* Db;
          insertVersionSpy(input);
          return {
            id: generateInfographicVersionId(),
            infographicId: input.infographicId,
            versionNumber: input.versionNumber,
            prompt: input.prompt ?? null,
            styleProperties: input.styleProperties ?? [],
            format: input.format,
            imageStorageKey: input.imageStorageKey,
            thumbnailStorageKey: null,
            createdAt: new Date(),
          } satisfies InfographicVersion;
        }),
      update: (id, data) =>
        Effect.gen(function* () {
          yield* Db;
          updateSpy(id, data);
          return {
            ...infographic,
            ...data,
          } as Infographic;
        }),
      deleteOldVersions: (id, limit) =>
        Effect.gen(function* () {
          yield* Db;
          deleteOldVersionsSpy(id, limit);
          return 1;
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockActivityLogRepo(),
      createMockLLM(),
      createMockImageGen(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    const result = await Effect.runPromise(
      executeInfographicGeneration({ infographicId: infographic.id }).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result.infographicId).toBe(infographic.id);
    expect(result.imageUrl).toContain('infographics/');
    expect(result.versionNumber).toBe(1);
    expect(insertVersionSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(infographic.id, {
      title: infographic.title,
      status: 'ready',
      imageStorageKey: expect.stringContaining(`infographics/${infographic.id}/`),
      errorMessage: null,
    });
    expect(deleteOldVersionsSpy).toHaveBeenCalledWith(infographic.id, 10);
  });
});
