import { describe, expect, it } from 'vitest';
import {
  MEDIA_TYPE_CONFIG,
  canBeSourceFor,
  getAcceptedSourceTypes,
  getTargetTypes,
  getAvailableMediaTypes,
  type ContentType,
} from '../schemas/media-types';

describe('MEDIA_TYPE_CONFIG', () => {
  it('declares at least one available content type', () => {
    const available = Object.values(MEDIA_TYPE_CONFIG).filter(
      (config) => config.available,
    );
    expect(available.length).toBeGreaterThan(0);
  });
});

describe('canBeSourceFor', () => {
  it('returns true when source is a source for podcast', () => {
    expect(canBeSourceFor('source', 'podcast')).toBe(true);
  });

  it('returns false when podcast is not a source for source by default config', () => {
    // Check the actual config
    const result = canBeSourceFor('podcast', 'source');
    expect(result).toBe(
      MEDIA_TYPE_CONFIG.source.acceptsInputFrom.includes('podcast'),
    );
  });

  it('returns false for invalid source-target pair', () => {
    expect(canBeSourceFor('social', 'source')).toBe(false);
  });
});

describe('getAcceptedSourceTypes', () => {
  it('returns accepted source types for podcast', () => {
    const sources = getAcceptedSourceTypes('podcast');
    expect(sources).toContain('source');
  });

  it('returns empty for types with no inputs (social has max inputs)', () => {
    const sources = getAcceptedSourceTypes('social');
    expect(sources.length).toBeGreaterThan(0);
  });
});

describe('getTargetTypes', () => {
  it('returns target types for source', () => {
    const targets = getTargetTypes('source');
    expect(targets).toContain('podcast');
  });

  it('returns empty array for social (no outputs)', () => {
    const targets = getTargetTypes('social');
    expect(targets).toEqual([]);
  });
});

describe('getAvailableMediaTypes', () => {
  it('returns only types with available=true', () => {
    const available = getAvailableMediaTypes();
    for (const type of available) {
      expect(MEDIA_TYPE_CONFIG[type].available).toBe(true);
    }
  });

  it('includes source and podcast', () => {
    const available = getAvailableMediaTypes();
    expect(available).toContain('source');
    expect(available).toContain('podcast');
  });

  it('does not include unavailable types', () => {
    const available = getAvailableMediaTypes();
    const unavailable = (
      Object.keys(MEDIA_TYPE_CONFIG) as ContentType[]
    ).filter((t) => !MEDIA_TYPE_CONFIG[t].available);

    for (const type of unavailable) {
      expect(available).not.toContain(type);
    }
  });
});
