import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Svg, SvgId } from '@repo/db/schema';
import { SvgNotFoundError } from '../../../errors';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSvgRepo } from '../../../test-utils/mock-svg-repo';
import { updateSvg } from '../update-svg';

const makeSvg = (overrides: Partial<Svg> = {}): Svg => ({
  id: 'svg_0000000000000001' as SvgId,
  title: 'Test SVG',
  description: null,
  svgContent: null,
  status: 'draft',
  createdBy: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('updateSvg', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('updates svg title and description', async () => {
    const user = createTestUser();
    const svg = makeSvg({ createdBy: user.id });

    const repo = createMockSvgRepo({
      findByIdForUser: (id: string, userId: string) =>
        id === svg.id && userId === user.id
          ? Effect.succeed(svg)
          : Effect.fail(new SvgNotFoundError({ svgId: id })),
      update: (id: string, data) =>
        Effect.succeed(
          makeSvg({
            ...svg,
            id: id as SvgId,
            title: data.title ?? svg.title,
            description: data.description ?? svg.description,
            updatedAt: new Date(),
          }),
        ),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        updateSvg({
          svgId: svg.id,
          title: 'Updated Title',
          description: 'Updated description',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.title).toBe('Updated Title');
    expect(result.description).toBe('Updated description');
  });

  it('updates only the title when description is not provided', async () => {
    const user = createTestUser();
    const svg = makeSvg({ createdBy: user.id, description: 'Original' });

    const repo = createMockSvgRepo({
      findByIdForUser: (id: string, userId: string) =>
        id === svg.id && userId === user.id
          ? Effect.succeed(svg)
          : Effect.fail(new SvgNotFoundError({ svgId: id })),
      update: (_id: string, data) =>
        Effect.succeed(
          makeSvg({
            ...svg,
            title: data.title ?? svg.title,
            description: data.description ?? svg.description,
          }),
        ),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        updateSvg({
          svgId: svg.id,
          title: 'New Title',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.title).toBe('New Title');
    expect(result.description).toBe('Original');
  });

  it('fails with SvgNotFoundError when svg does not exist', async () => {
    const user = createTestUser();

    const repo = createMockSvgRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        updateSvg({ svgId: 'svg_nonexistent00000', title: 'X' }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgNotFoundError');
    }
  });

  it('fails with SvgNotFoundError when non-owner tries to update', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const svg = makeSvg({ createdBy: otherUser.id });

    const repo = createMockSvgRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        updateSvg({ svgId: svg.id, title: 'Hacked' }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgNotFoundError');
      expect((error as SvgNotFoundError).svgId).toBe(svg.id);
    }
  });
});
