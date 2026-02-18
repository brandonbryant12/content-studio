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
    styleProperties: data.styleProperties ?? [],
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
          format: 'portrait',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.title).toBe('My Infographic');
    expect(result.format).toBe('portrait');
    expect(result.styleProperties).toEqual([]);
    expect(result.status).toBe('draft');
    expect(result.createdBy).toBe(user.id);
  });

  it('creates with optional prompt and style properties', async () => {
    const user = createTestUser();

    const repo = createMockInfographicRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createInfographic({
          title: 'With Style',
          format: 'square',
          prompt: 'Compare sales data',
          styleProperties: [
            { key: 'Background', value: '#000', type: 'color' },
            { key: 'Mood', value: 'dark', type: 'text' },
          ],
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.prompt).toBe('Compare sales data');
    expect(result.styleProperties).toEqual([
      { key: 'Background', value: '#000', type: 'color' },
      { key: 'Mood', value: 'dark', type: 'text' },
    ]);
  });

  it('sanitizes style properties before insert', async () => {
    const user = createTestUser();

    const repo = createMockInfographicRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createInfographic({
          title: 'Sanitized',
          format: 'square',
          styleProperties: [
            { key: '  Background  ', value: ' #111111 ', type: 'color' },
            { key: '   ', value: 'drop me', type: 'text' },
            { key: 'Mood', value: '   ' },
          ],
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.styleProperties).toEqual([
      { key: 'Background', value: '#111111', type: 'color' },
    ]);
  });

  it('fails when user is not authenticated', async () => {
    const repo = createMockInfographicRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      createInfographic({
        title: 'No Auth',
        format: 'portrait',
      }).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
  });
});
