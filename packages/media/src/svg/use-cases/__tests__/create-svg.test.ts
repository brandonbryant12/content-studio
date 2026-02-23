import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { InsertSvg } from '../../repos/svg-repo';
import type { Svg } from '@repo/db/schema';
import { createMockSvgRepo } from '../../../test-utils/mock-svg-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createSvg } from '../create-svg';

const mockInsertFn = (data: InsertSvg) =>
  Effect.succeed({
    id: 'svg_0000000000000001' as Svg['id'],
    title: data.title ?? null,
    description: data.description ?? null,
    svgContent: data.svgContent ?? null,
    status: data.status ?? 'draft',
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Svg);

describe('createSvg', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('creates an svg with valid input', async () => {
    const user = createTestUser();

    const repo = createMockSvgRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createSvg({
          title: 'My SVG',
          description: 'A test SVG',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.title).toBe('My SVG');
    expect(result.description).toBe('A test SVG');
    expect(result.status).toBe('draft');
    expect(result.createdBy).toBe(user.id);
  });

  it('creates with default optional fields', async () => {
    const user = createTestUser();

    const repo = createMockSvgRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(createSvg({})).pipe(Effect.provide(layers)),
    );

    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
    expect(result.svgContent).toBeNull();
    expect(result.status).toBe('draft');
    expect(result.createdBy).toBe(user.id);
  });

  it('fails when user is not authenticated', async () => {
    const repo = createMockSvgRepo({ insert: mockInsertFn });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      createSvg({
        title: 'No Auth',
      }).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
  });
});
