import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Svg, SvgId, SvgMessage, SvgMessageId } from '@repo/db/schema';
import { SvgNotFoundError } from '../../../errors';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSvgMessageRepo } from '../../../test-utils/mock-svg-message-repo';
import { createMockSvgRepo } from '../../../test-utils/mock-svg-repo';
import { listMessages } from '../list-messages';

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

const makeMessage = (overrides: Partial<SvgMessage> = {}): SvgMessage => ({
  id: 'svm_0000000000000001' as SvgMessageId,
  svgId: 'svg_0000000000000001' as SvgId,
  role: 'user',
  content: 'Hello',
  createdAt: new Date(),
  ...overrides,
});

describe('listMessages', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns messages for an owned svg', async () => {
    const user = createTestUser();
    const svg = makeSvg({ createdBy: user.id });
    const msg1 = makeMessage({ svgId: svg.id, role: 'user', content: 'Create a circle' });
    const msg2 = makeMessage({
      id: 'svm_0000000000000002' as SvgMessageId,
      svgId: svg.id,
      role: 'assistant',
      content: '<svg><circle/></svg>',
    });

    const svgRepo = createMockSvgRepo({
      findByIdForUser: (id: string, userId: string) =>
        id === svg.id && userId === user.id
          ? Effect.succeed(svg)
          : Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const messageRepo = createMockSvgMessageRepo({
      listBySvgId: (svgId: string) =>
        svgId === svg.id
          ? Effect.succeed([msg1, msg2])
          : Effect.succeed([]),
    });
    const layers = Layer.mergeAll(MockDbLive, svgRepo, messageRepo);

    const result = await Effect.runPromise(
      withTestUser(user)(listMessages({ svgId: svg.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result).toHaveLength(2);
    expect(result[0]!.role).toBe('user');
    expect(result[1]!.role).toBe('assistant');
  });

  it('returns empty array when svg has no messages', async () => {
    const user = createTestUser();
    const svg = makeSvg({ createdBy: user.id });

    const svgRepo = createMockSvgRepo({
      findByIdForUser: (id: string, userId: string) =>
        id === svg.id && userId === user.id
          ? Effect.succeed(svg)
          : Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const messageRepo = createMockSvgMessageRepo({
      listBySvgId: () => Effect.succeed([]),
    });
    const layers = Layer.mergeAll(MockDbLive, svgRepo, messageRepo);

    const result = await Effect.runPromise(
      withTestUser(user)(listMessages({ svgId: svg.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result).toHaveLength(0);
  });

  it('fails with SvgNotFoundError when svg does not exist', async () => {
    const user = createTestUser();

    const svgRepo = createMockSvgRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const messageRepo = createMockSvgMessageRepo();
    const layers = Layer.mergeAll(MockDbLive, svgRepo, messageRepo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        listMessages({ svgId: 'svg_nonexistent00000' }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('SvgNotFoundError');
    }
  });

  it('fails with SvgNotFoundError when non-owner requests messages', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const svg = makeSvg({ createdBy: otherUser.id });

    const svgRepo = createMockSvgRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new SvgNotFoundError({ svgId: id })),
    });
    const messageRepo = createMockSvgMessageRepo();
    const layers = Layer.mergeAll(MockDbLive, svgRepo, messageRepo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(listMessages({ svgId: svg.id })).pipe(
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
