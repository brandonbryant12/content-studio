import { Effect, Option } from 'effect';
import type {
  AIUsageRecordInput,
  AIUsageScope,
  PersistAIUsageInput,
} from './types';
import type { JsonValue } from '@repo/db/schema';
import { AIUsageRecorder, type AIUsageRecorderService } from './recorder';
import { getAIUsageScope, mergeAIUsageScope } from './scope';

const normalizeJsonValue = (value: unknown): JsonValue | undefined => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized: JsonValue[] = [];
    for (const entry of value) {
      const normalizedEntry = normalizeJsonValue(entry);
      if (normalizedEntry !== undefined) {
        normalized.push(normalizedEntry);
      }
    }
    return normalized;
  }

  if (typeof value === 'object' && value !== null) {
    const normalized: Record<string, JsonValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      const normalizedEntry = normalizeJsonValue(entry);
      if (normalizedEntry !== undefined) {
        normalized[key] = normalizedEntry;
      }
    }
    return normalized;
  }

  return undefined;
};

const normalizeJsonRecord = (
  record?: Record<string, unknown> | null,
): Record<string, JsonValue> | null => {
  if (!record) {
    return null;
  }

  const normalized: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(record)) {
    const normalizedValue = normalizeJsonValue(value);
    if (normalizedValue !== undefined) {
      normalized[key] = normalizedValue;
    }
  }

  if (Object.keys(normalized).length === 0) {
    return null;
  }

  return normalized;
};

const buildPersistAIUsageInput = (
  scope: AIUsageScope,
  input: AIUsageRecordInput,
): PersistAIUsageInput => {
  const { scope: _inputScope, ...persistableInput } = input;
  const mergedScope = input.scope
    ? mergeAIUsageScope(scope, input.scope)
    : scope;

  return {
    ...persistableInput,
    userId: mergedScope.userId ?? null,
    requestId: mergedScope.requestId ?? null,
    jobId: mergedScope.jobId ?? null,
    scopeOperation: mergedScope.operation ?? null,
    resourceType: mergedScope.resourceType ?? null,
    resourceId: mergedScope.resourceId ?? null,
    usage: normalizeJsonRecord(input.usage) ?? {},
    metadata: normalizeJsonRecord(input.metadata),
    rawUsage: normalizeJsonRecord(input.rawUsage),
  };
};

const logAIUsageWarning = (input: AIUsageRecordInput, error: unknown) =>
  Effect.logWarning({
    event: 'aiUsage.record.failed',
    provider: input.provider,
    providerOperation: input.providerOperation,
    modality: input.modality,
    error:
      error instanceof Error
        ? { message: error.message }
        : { message: String(error) },
  });

const runRecorder = (
  recorder: AIUsageRecorderService,
  scope: AIUsageScope,
  input: AIUsageRecordInput,
) =>
  recorder
    .record(buildPersistAIUsageInput(scope, input))
    .pipe(Effect.catchAll((error) => logAIUsageWarning(input, error)));

export const recordAIUsageIfConfigured = (input: AIUsageRecordInput) =>
  Effect.gen(function* () {
    const recorderOption = yield* Effect.serviceOption(AIUsageRecorder);
    if (Option.isNone(recorderOption)) {
      return;
    }

    const scope = yield* getAIUsageScope;
    yield* runRecorder(recorderOption.value, scope, input);
  });

export const createAsyncAIUsageRecorder = (
  recorderOption: Option.Option<AIUsageRecorderService>,
  scope: AIUsageScope,
) => {
  if (Option.isNone(recorderOption)) {
    return (_input: AIUsageRecordInput): void => undefined;
  }

  const recorder = recorderOption.value;

  return (input: AIUsageRecordInput): void => {
    void Effect.runPromise(runRecorder(recorder, scope, input));
  };
};

export const getAIUsageErrorTag = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof error._tag === 'string'
  ) {
    return error._tag;
  }

  if (error instanceof Error && error.name.length > 0) {
    return error.name;
  }

  return 'UnknownError';
};
