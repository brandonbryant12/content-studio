import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestInfographic,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import type { Infographic } from '@repo/db/schema';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { listInfographics } from '../list-infographics';

// =============================================================================
// Tests
// =============================================================================

describe('listInfographics', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns infographics for the current user', async () => {
    const user = createTestUser();
    const infographic1 = createTestInfographic({ createdBy: user.id });
    const infographic2 = createTestInfographic({ createdBy: user.id });

    const repo = createMockInfographicRepo({
      list: (options) => {
        if (options.createdBy === user.id) {
          return Effect.succeed([
            infographic1,
            infographic2,
          ] as readonly Infographic[]);
        }
        return Effect.succeed([] as readonly Infographic[]);
      },
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(listInfographics({})).pipe(Effect.provide(layers)),
    );

    expect(result).toHaveLength(2);
  });

  it('returns empty array when user has no infographics', async () => {
    const user = createTestUser();

    const repo = createMockInfographicRepo({
      list: () => Effect.succeed([] as readonly Infographic[]),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(listInfographics({})).pipe(Effect.provide(layers)),
    );

    expect(result).toEqual([]);
  });

  it('passes limit and offset to repo', async () => {
    const user = createTestUser();
    let capturedOptions: { limit?: number; offset?: number } = {};

    const repo = createMockInfographicRepo({
      list: (options) => {
        capturedOptions = { limit: options.limit, offset: options.offset };
        return Effect.succeed([] as readonly Infographic[]);
      },
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    await Effect.runPromise(
      withTestUser(user)(listInfographics({ limit: 10, offset: 5 })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(capturedOptions.limit).toBe(10);
    expect(capturedOptions.offset).toBe(5);
  });

  it('does not return infographics from other users', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const otherInfographic = createTestInfographic({
      createdBy: otherUser.id,
    });

    const repo = createMockInfographicRepo({
      list: (options) => {
        if (options.createdBy === user.id) {
          return Effect.succeed([] as readonly Infographic[]);
        }
        return Effect.succeed([otherInfographic] as readonly Infographic[]);
      },
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(listInfographics({})).pipe(Effect.provide(layers)),
    );

    expect(result).toHaveLength(0);
  });
});
