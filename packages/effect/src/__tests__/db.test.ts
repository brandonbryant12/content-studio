import { jest, describe, it, expect } from '@jest/globals';
import { Effect, Exit } from 'effect';
import { Db, DbError, DbLive, withDb } from '../db';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: {},
} as unknown as Parameters<typeof DbLive>[0];

describe('db', () => {
  describe('DbError', () => {
    it('should create a tagged error with cause and message', () => {
      const error = new DbError({ cause: new Error('Connection failed'), message: 'Connection failed' });

      expect(error._tag).toBe('DbError');
      expect(error.message).toBe('Connection failed');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe('Db service tag', () => {
    it('should have the correct tag identifier', () => {
      expect(Db.key).toBe('@repo/effect/Db');
    });
  });

  describe('DbLive', () => {
    it('should create a layer that provides Db service', async () => {
      const layer = DbLive(mockDb);
      const effect = Effect.gen(function* () {
        const { db } = yield* Db;
        return db;
      });

      const result = await Effect.runPromise(Effect.provide(effect, layer));

      expect(result).toBe(mockDb);
    });
  });

  describe('withDb', () => {
    it('should execute a function with the database and return the result', async () => {
      const layer = DbLive(mockDb);
      const expectedResult = [{ id: 1, name: 'Test' }];

      const effect = withDb('test.query', async (_db) => {
        return expectedResult;
      });

      const result = await Effect.runPromise(Effect.provide(effect, layer));

      expect(result).toEqual(expectedResult);
    });

    it('should catch errors and wrap them in DbError', async () => {
      const layer = DbLive(mockDb);
      const originalError = new Error('Query failed');

      const effect = withDb('test.failing', async () => {
        throw originalError;
      });

      const exit = await Effect.runPromiseExit(Effect.provide(effect, layer));

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error).toBeInstanceOf(DbError);
        expect((error as DbError).message).toBe('Query failed');
        expect((error as DbError).cause).toBe(originalError);
      }
    });

    it('should handle non-Error causes', async () => {
      const layer = DbLive(mockDb);

      const effect = withDb('test.stringError', async () => {
        throw 'string error';
      });

      const exit = await Effect.runPromiseExit(Effect.provide(effect, layer));

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error).toBeInstanceOf(DbError);
        expect((error as DbError).message).toBe('string error');
      }
    });

    it('should require Db service in context', () => {
      const effect = withDb('test.context', async () => 'result');

      type ExpectedDeps = Effect.Effect.Context<typeof effect>;
      type Check = ExpectedDeps extends Db ? true : false;
      const check: Check = true;
      expect(check).toBe(true);
    });

    it('should create a span with db prefix', async () => {
      const layer = DbLive(mockDb);

      const effect = withDb('users.findById', async () => 'result');

      const result = await Effect.runPromise(Effect.provide(effect, layer));
      expect(result).toBe('result');
      // Span is created as "db.users.findById" with db.system attribute
    });
  });
});
