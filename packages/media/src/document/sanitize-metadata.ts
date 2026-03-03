import type { JsonValue } from '@repo/db/schema';

type MetadataInput = Record<string, JsonValue> | null | undefined;

export const sanitizeMetadata = (metadata: MetadataInput) => {
  if (!metadata) return undefined;

  const entries: Array<[string, JsonValue]> = [];

  for (const [key, value] of Object.entries(metadata)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) continue;
      entries.push([trimmedKey, trimmedValue]);
      continue;
    }

    entries.push([trimmedKey, value]);
  }

  return Object.fromEntries(entries);
};
