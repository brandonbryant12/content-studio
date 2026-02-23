import { MockLLMLive } from '@repo/ai/testing';
import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Svg, SvgId } from '@repo/db/schema';
import {
  SvgNotFoundError,
  SvgGenerationInProgressError,
} from '../../../errors';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSvgMessageRepo } from '../../../test-utils/mock-svg-message-repo';
import { createMockSvgRepo } from '../../../test-utils/mock-svg-repo';
import { streamSvgChat } from '../stream-svg-chat';

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

describe('streamSvgChat', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('fails when user is not authenticated', async () => {
    const svgRepo = createMockSvgRepo();
    const messageRepo = createMockSvgMessageRepo();
    const layers = Layer.mergeAll(MockDbLive, MockLLMLive, svgRepo, messageRepo);

    const result = await Effect.runPromiseExit(
      streamSvgChat({
        svgId: 'svg_0000000000000001' as SvgId,
        message: 'Draw a circle',
      }).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
  });

  it('fails with SvgNotFoundError when svg does not exist', async () => {
    const user = createTestUser();

    const svgRepo = createMockSvgRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new SvgNotFoundError({ svgId: id })),
      failGeneration: () => Effect.succeed(undefined),
    });
    const messageRepo = createMockSvgMessageRepo();
    const layers = Layer.mergeAll(MockDbLive, MockLLMLive, svgRepo, messageRepo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        streamSvgChat({
          svgId: 'svg_nonexistent00000' as SvgId,
          message: 'Draw a circle',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgNotFoundError');
    }
  });

  it('fails with SvgNotFoundError when non-owner attempts to stream', async () => {
    const user = createTestUser();
    const svg = makeSvg({ createdBy: 'someone-else' });

    const svgRepo = createMockSvgRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new SvgNotFoundError({ svgId: id })),
      failGeneration: () => Effect.succeed(undefined),
    });
    const messageRepo = createMockSvgMessageRepo();
    const layers = Layer.mergeAll(MockDbLive, MockLLMLive, svgRepo, messageRepo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        streamSvgChat({
          svgId: svg.id,
          message: 'Draw a circle',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgNotFoundError');
      expect((error as SvgNotFoundError).svgId).toBe(svg.id);
    }
  });

  it('fails with SvgGenerationInProgressError when lock cannot be acquired', async () => {
    const user = createTestUser();
    const svg = makeSvg({ createdBy: user.id, status: 'generating' });

    const svgRepo = createMockSvgRepo({
      findByIdForUser: (id: string, userId: string) =>
        id === svg.id && userId === user.id
          ? Effect.succeed(svg)
          : Effect.fail(new SvgNotFoundError({ svgId: id })),
      tryAcquireGenerationLock: (svgId: string) =>
        Effect.fail(new SvgGenerationInProgressError({ svgId })),
      failGeneration: () => Effect.succeed(undefined),
    });
    const messageRepo = createMockSvgMessageRepo();
    const layers = Layer.mergeAll(MockDbLive, MockLLMLive, svgRepo, messageRepo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        streamSvgChat({
          svgId: svg.id,
          message: 'Draw a circle',
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgGenerationInProgressError');
      expect((error as SvgGenerationInProgressError).svgId).toBe(svg.id);
    }
  });
});
