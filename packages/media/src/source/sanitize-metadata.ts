import type { JsonValue } from '@repo/db/schema';

type MetadataInput = Record<string, JsonValue> | null | undefined;

export const sanitizeMetadata = (metadata: MetadataInput) => {
  if (!metadata) return undefined;

  const entries = Object.entries(metadata).flatMap(([key, value]) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return [];

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) return [];
      return [[trimmedKey, trimmedValue] satisfies [string, JsonValue]];
    }

    return [[trimmedKey, value] satisfies [string, JsonValue]];
  });

  return Object.fromEntries(entries);
};
