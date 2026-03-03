import type { StyleProperty } from '@repo/db/schema';

const VALID_STYLE_TYPES: ReadonlySet<NonNullable<StyleProperty['type']>> =
  new Set(['text', 'color', 'number']);

const normalizeType = (
  type: StyleProperty['type'],
): NonNullable<StyleProperty['type']> | undefined => {
  if (type && VALID_STYLE_TYPES.has(type)) {
    return type;
  }
  return undefined;
};

const sanitizeStyleProperty = (
  property: StyleProperty,
): StyleProperty | null => {
  const key = property.key.trim();
  const value = property.value.trim();

  if (!key || !value) {
    return null;
  }

  const type = normalizeType(property.type);
  return type ? { key, value, type } : { key, value };
};

export const sanitizeStyleProperties = (
  properties: readonly StyleProperty[] = [],
): StyleProperty[] => {
  const result: StyleProperty[] = [];

  for (const property of properties) {
    const sanitized = sanitizeStyleProperty(property);
    if (sanitized) {
      result.push(sanitized);
    }
  }

  return result;
};
