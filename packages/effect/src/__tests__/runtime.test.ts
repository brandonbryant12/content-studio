import { Effect } from 'effect';
import { vi, describe, it, expect } from 'vitest';
import type { DbLive } from '../db';
import { Db } from '../db';
import { createAppLayer, createAppRuntime, runEffect } from '../runtime';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: {},
} as unknown as Parameters<typeof DbLive>[0];

describe('runtime', () => {
  describe('createAppLayer', () => {
    it('should create a layer that provides Db service', async () => {
      const layer = createAppLayer(mockDb);

      const effect = Effect.gen(function* () {
        const { db } = yield* Db;
        return db;
      });

      const result = await Effect.runPromise(Effect.provide(effect, layer));

      expect(result).toBe(mockDb);
    });
  });

  describe('createAppRuntime', () => {
    it('should create a managed runtime', async () => {
      const runtime = createAppRuntime(mockDb);

      expect(runtime).toBeDefined();
      expect(typeof runtime.runPromise).toBe('function');
    });
  });

  describe('runEffect', () => {
    it('should run an effect with the runtime and return the result', async () => {
      const runtime = createAppRuntime(mockDb);

      const effect = Effect.gen(function* () {
        const { db } = yield* Db;
        return db === mockDb ? 'success' : 'failure';
      });

      const result = await runEffect(runtime, effect);

      expect(result).toBe('success');
    });

    it('should propagate effect failures as promise rejections', async () => {
      const runtime = createAppRuntime(mockDb);

      const effect = Effect.fail(new Error('Test error'));

      await expect(
        runEffect(
          runtime,
          effect as unknown as Effect.Effect<never, Error, Db>,
        ),
      ).rejects.toThrow('Test error');
    });
  });
});
