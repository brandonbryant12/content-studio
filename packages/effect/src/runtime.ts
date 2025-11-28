import { ManagedRuntime } from 'effect';
import type { Db} from './db';
import type { DatabaseInstance } from '@repo/db/client';
import type { Effect, Layer} from 'effect';
import { DbLive } from './db';

export type AppLayer = Layer.Layer<Db>;

export const createAppLayer = (db: DatabaseInstance): AppLayer => DbLive(db);

export const createAppRuntime = (db: DatabaseInstance) =>
  ManagedRuntime.make(createAppLayer(db));

export type AppRuntime = ReturnType<typeof createAppRuntime>;

export const runEffect = <A, E>(
  runtime: Awaited<AppRuntime>,
  effect: Effect.Effect<A, E, Db>,
): Promise<A> => runtime.runPromise(effect);
