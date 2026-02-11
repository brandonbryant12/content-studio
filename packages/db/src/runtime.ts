import { ManagedRuntime } from 'effect';
import type { Effect, Layer } from 'effect';
import type { DatabaseInstance } from './client';
import { type Db, DbLive } from './effect';

export type AppLayer = Layer.Layer<Db>;

export const createAppLayer = (db: DatabaseInstance): AppLayer => DbLive(db);

export const createAppRuntime = (db: DatabaseInstance) =>
  ManagedRuntime.make(createAppLayer(db));

export type AppRuntime = ReturnType<typeof createAppRuntime>;

export const runEffect = <A, E>(
  runtime: Awaited<AppRuntime>,
  effect: Effect.Effect<A, E, Db>,
): Promise<A> => runtime.runPromise(effect);
