import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Svg, SvgId } from '@repo/db/schema';
import { SvgNotFoundError } from '../../../errors';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockSvgRepo } from '../../../test-utils/mock-svg-repo';
import { deleteSvg } from '../delete-svg';

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

describe('deleteSvg', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('deletes svg when owned by user', async () => {
      const user = createTestUser();
      const svg = makeSvg({ createdBy: user.id });

      let deletedFromRepo = false;
      const repo = createMockSvgRepo({
        findByIdForUser: (id: string, userId: string) =>
          id === svg.id && userId === user.id
            ? Effect.succeed(svg)
            : Effect.fail(new SvgNotFoundError({ svgId: id })),
        delete: () => {
          deletedFromRepo = true;
          return Effect.succeed(undefined);
        },
      });

      const layers = Layer.mergeAll(MockDbLive, repo);

      await Effect.runPromise(
        withTestUser(user)(deleteSvg({ svgId: svg.id })).pipe(
          Effect.provide(layers),
        ),
      );

      expect(deletedFromRepo).toBe(true);
    });
  });

  describe('authorization', () => {
    it('fails with SvgNotFoundError when non-owner tries to delete', async () => {
      const user = createTestUser();
      const otherUser = createTestUser();
      const svg = makeSvg({ createdBy: otherUser.id });

      const repo = createMockSvgRepo({
        findByIdForUser: (id: string) =>
          Effect.fail(new SvgNotFoundError({ svgId: id })),
      });

      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(deleteSvg({ svgId: svg.id })).pipe(
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

  describe('error cases', () => {
    it('fails with SvgNotFoundError when svg does not exist', async () => {
      const user = createTestUser();

      const repo = createMockSvgRepo({
        findByIdForUser: (id: string) =>
          Effect.fail(new SvgNotFoundError({ svgId: id })),
      });

      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(deleteSvg({ svgId: 'svg_nonexistent00000' })).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SvgNotFoundError');
      }
    });
  });
});
