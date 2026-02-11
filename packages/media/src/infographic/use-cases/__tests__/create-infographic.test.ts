import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { InsertInfographic } from '../../repos/infographic-repo';
import type { Infographic } from '@repo/db/schema';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createInfographic } from '../create-infographic';

const mockInsertFn = (data: InsertInfographic) =>
  Effect.succeed({
    ...data,
    prompt: data.prompt ?? null,
    sourceDocumentIds: (data.sourceDocumentIds as string[]) ?? [],
    imageStorageKey: null,
    thumbnailStorageKey: null,
    errorMessage: null,
    status: data.status ?? 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Infographic);

describe('createInfographic', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('creates an infographic with valid input', async () => {
    const user = createTestUser();

    const repo = createMockInfographicRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createInfographic({
          title: 'My Infographic',
          infographicType: 'timeline',
          stylePreset: 'modern_minimal',
          format: 'portrait',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.title).toBe('My Infographic');
    expect(result.infographicType).toBe('timeline');
    expect(result.stylePreset).toBe('modern_minimal');
    expect(result.format).toBe('portrait');
    expect(result.status).toBe('draft');
    expect(result.createdBy).toBe(user.id);
  });

  it('creates with optional prompt and source documents', async () => {
    const user = createTestUser();

    const repo = createMockInfographicRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createInfographic({
          title: 'With Prompt',
          infographicType: 'comparison',
          stylePreset: 'bold_colorful',
          format: 'square',
          prompt: 'Compare sales data',
          sourceDocumentIds: ['doc1', 'doc2'],
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.prompt).toBe('Compare sales data');
    expect(result.sourceDocumentIds).toEqual(['doc1', 'doc2']);
  });

  it('fails when user is not authenticated', async () => {
    const repo = createMockInfographicRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      createInfographic({
        title: 'No Auth',
        infographicType: 'timeline',
        stylePreset: 'modern_minimal',
        format: 'portrait',
      }).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
  });
});
