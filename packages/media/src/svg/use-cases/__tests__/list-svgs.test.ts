import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Svg, SvgId } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSvgRepo } from '../../../test-utils/mock-svg-repo';
import { listSvgs } from '../list-svgs';

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

describe('listSvgs', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns svgs for the current user', async () => {
    const user = createTestUser();
    const svg1 = makeSvg({ id: 'svg_0000000000000001' as SvgId, createdBy: user.id, title: 'First' });
    const svg2 = makeSvg({ id: 'svg_0000000000000002' as SvgId, createdBy: user.id, title: 'Second' });

    const repo = createMockSvgRepo({
      list: (userId: string) =>
        userId === user.id
          ? Effect.succeed([svg1, svg2])
          : Effect.succeed([]),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(listSvgs({})).pipe(Effect.provide(layers)),
    );

    expect(result).toHaveLength(2);
    expect(result[0]!.title).toBe('First');
    expect(result[1]!.title).toBe('Second');
  });

  it('returns empty array when user has no svgs', async () => {
    const user = createTestUser();

    const repo = createMockSvgRepo({
      list: () => Effect.succeed([]),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(listSvgs({})).pipe(Effect.provide(layers)),
    );

    expect(result).toHaveLength(0);
  });

  it('passes limit and offset to the repo', async () => {
    const user = createTestUser();
    let capturedOptions: { limit?: number; offset?: number } | undefined;

    const repo = createMockSvgRepo({
      list: (_userId: string, options?: { limit?: number; offset?: number }) => {
        capturedOptions = options;
        return Effect.succeed([]);
      },
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    await Effect.runPromise(
      withTestUser(user)(listSvgs({ limit: 10, offset: 5 })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(capturedOptions?.limit).toBe(10);
    expect(capturedOptions?.offset).toBe(5);
  });

  it('fails when user is not authenticated', async () => {
    const repo = createMockSvgRepo({
      list: () => Effect.succeed([]),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      listSvgs({}).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
  });
});
