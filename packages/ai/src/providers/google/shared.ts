import { Effect } from 'effect';
import type { AIUsageRecordInput } from '../../usage/types';
import type { JsonValue } from '@repo/db/schema';
import { recordAIUsageIfConfigured } from '../../usage/record';

export const compactJsonRecord = (
  record: Record<string, JsonValue | undefined>,
): Record<string, JsonValue> =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Record<string, JsonValue>;

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

export function getObjectField(
  value: unknown,
  field: string,
): Record<string, unknown> | undefined {
  const maybeValue = asRecord(value)?.[field];
  return typeof maybeValue === 'object' && maybeValue !== null
    ? (maybeValue as Record<string, unknown>)
    : undefined;
}

export function getStringField(
  value: unknown,
  field: string,
): string | undefined {
  const maybeValue = asRecord(value)?.[field];
  return typeof maybeValue === 'string' ? maybeValue : undefined;
}

export function getNumberField(
  value: Record<string, unknown> | undefined,
  field: string,
): number | undefined {
  const maybeValue = value?.[field];
  return typeof maybeValue === 'number' ? maybeValue : undefined;
}

export function getBooleanField(
  value: unknown,
  field: string,
): boolean | undefined {
  const maybeValue = asRecord(value)?.[field];
  return typeof maybeValue === 'boolean' ? maybeValue : undefined;
}

export const toBillableTokenUsageFromUsageMetadata = (
  usageMetadata?: Record<string, unknown>,
) => ({
  inputTokens: getNumberField(usageMetadata, 'promptTokenCount'),
  outputTokens: getNumberField(usageMetadata, 'candidatesTokenCount'),
});

export const recordProviderCallIfConfigured = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options: {
    readonly onSuccess?: (result: A) => AIUsageRecordInput;
    readonly onError?: (error: E) => AIUsageRecordInput;
  },
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.tap((result) =>
      options.onSuccess
        ? recordAIUsageIfConfigured(options.onSuccess(result))
        : Effect.void,
    ),
    Effect.tapError((error) =>
      options.onError
        ? recordAIUsageIfConfigured(options.onError(error))
        : Effect.void,
    ),
  );
