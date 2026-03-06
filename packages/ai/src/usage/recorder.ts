import { Db, withDb, type DatabaseError } from '@repo/db/effect';
import { aiUsageEvent } from '@repo/db/schema';
import { Context, Effect, Layer } from 'effect';
import type { PersistAIUsageInput } from './types';

export interface AIUsageRecorderService {
  readonly record: (
    input: PersistAIUsageInput,
  ) => Effect.Effect<void, DatabaseError>;
}

export class AIUsageRecorder extends Context.Tag('@repo/ai/AIUsageRecorder')<
  AIUsageRecorder,
  AIUsageRecorderService
>() {}

export const DatabaseAIUsageRecorderLive: Layer.Layer<
  AIUsageRecorder,
  never,
  Db
> = Layer.effect(
  AIUsageRecorder,
  Effect.gen(function* () {
    const dbService = yield* Db;

    return {
      record: (input: PersistAIUsageInput) =>
        withDb('aiUsageRecorder.record', (db) =>
          db
            .insert(aiUsageEvent)
            .values({
              userId: input.userId ?? null,
              requestId: input.requestId ?? null,
              jobId: input.jobId ?? null,
              scopeOperation: input.scopeOperation ?? null,
              resourceType: input.resourceType ?? null,
              resourceId: input.resourceId ?? null,
              modality: input.modality,
              provider: input.provider,
              providerOperation: input.providerOperation,
              model: input.model ?? null,
              status: input.status,
              errorTag: input.errorTag ?? null,
              usage: input.usage ?? {},
              metadata: input.metadata ?? null,
              rawUsage: input.rawUsage ?? null,
              estimatedCostUsdMicros: input.estimatedCostUsdMicros ?? null,
              providerResponseId: input.providerResponseId ?? null,
            })
            .then(() => undefined),
        ).pipe(Effect.provideService(Db, dbService)),
    } satisfies AIUsageRecorderService;
  }),
);

export const NoopAIUsageRecorderLive: Layer.Layer<AIUsageRecorder> =
  Layer.succeed(AIUsageRecorder, {
    record: () => Effect.void,
  });
