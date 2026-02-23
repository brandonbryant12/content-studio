import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Svg, SvgId } from '@repo/db/schema';
import { SvgNotFoundError } from '../../../errors';
import { createMockSvgRepo } from '../../../test-utils/mock-svg-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { getSvg } from '../get-svg';

const makeSvg = (overrides: Partial<Svg> = {}): Svg => ({
  id: 'svg_0000000000000001' as SvgId,
  title: 'Test SVG',
  description: 'A test svg',
  svgContent: '<svg></svg>',
  status: 'draft',
  createdBy: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('getSvg', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns svg when found and owned by user', async () => {
    const user = createTestUser();
    const svg = makeSvg({ createdBy: user.id });

    const repo = createMockSvgRepo({
      findByIdForUser: (id: string, userId: string) =>
        id === svg.id && userId === user.id
          ? Effect.succeed(svg)
          : Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(getSvg({ svgId: svg.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result.id).toBe(svg.id);
    expect(result.title).toBe('Test SVG');
  });

  it('fails with SvgNotFoundError when not found', async () => {
    const user = createTestUser();

    const repo = createMockSvgRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(getSvg({ svgId: 'svg_nonexistent00000' })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgNotFoundError');
    }
  });

  it('fails with SvgNotFoundError when owned by another user', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const svg = makeSvg({ createdBy: otherUser.id });

    const repo = createMockSvgRepo({
      findByIdForUser: (id: string, userId: string) =>
        userId === otherUser.id
          ? Effect.succeed(svg)
          : Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(getSvg({ svgId: svg.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgNotFoundError');
      expect((error as SvgNotFoundError).svgId).toBe(svg.id);
    }
  });
});
