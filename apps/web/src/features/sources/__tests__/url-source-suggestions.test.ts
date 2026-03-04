import { describe, expect, it, vi } from 'vitest';
import {
  URL_SOURCE_SUGGESTIONS,
  getRandomUrlSourceSuggestions,
} from '../lib/url-source-suggestions';

describe('getRandomUrlSourceSuggestions', () => {
  it('returns exactly the requested count when enough items exist', () => {
    const suggestions = getRandomUrlSourceSuggestions(3);
    expect(suggestions).toHaveLength(3);
  });

  it('does not return duplicates in the sampled set', () => {
    const suggestions = getRandomUrlSourceSuggestions(3);
    const uniqueUrls = new Set(suggestions.map((item) => item.url));
    expect(uniqueUrls.size).toBe(3);
  });

  it('caps selection at pool size', () => {
    const suggestions = getRandomUrlSourceSuggestions(999);
    expect(suggestions).toHaveLength(URL_SOURCE_SUGGESTIONS.length);
  });

  it('is deterministic when Math.random is mocked', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const suggestions = getRandomUrlSourceSuggestions(3);
    randomSpy.mockRestore();

    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((item) => item.url)).toEqual([
      URL_SOURCE_SUGGESTIONS[1]!.url,
      URL_SOURCE_SUGGESTIONS[2]!.url,
      URL_SOURCE_SUGGESTIONS[3]!.url,
    ]);
  });
});
