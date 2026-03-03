import { describe, expect, it } from 'vitest';
import { sanitizeMetadata } from '../sanitize-metadata';

describe('sanitizeMetadata', () => {
  it('returns undefined for nullish input', () => {
    expect(sanitizeMetadata(undefined)).toBeUndefined();
    expect(sanitizeMetadata(null)).toBeUndefined();
  });

  it('trims keys and string values', () => {
    expect(
      sanitizeMetadata({
        '  topic  ': '  AI agents  ',
        author: '  Brandon ',
      }),
    ).toEqual({
      topic: 'AI agents',
      author: 'Brandon',
    });
  });

  it('drops empty keys and blank string values', () => {
    expect(
      sanitizeMetadata({
        '   ': 'ignored',
        keep: 'value',
        blank: '   ',
      }),
    ).toEqual({
      keep: 'value',
    });
  });

  it('preserves non-string json values', () => {
    expect(
      sanitizeMetadata({
        count: 3,
        active: false,
        nested: { source: 'url' },
        tags: ['a', 'b'],
        empty: null,
      }),
    ).toEqual({
      count: 3,
      active: false,
      nested: { source: 'url' },
      tags: ['a', 'b'],
      empty: null,
    });
  });
});
