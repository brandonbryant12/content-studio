import { describe, expect, it } from 'vitest';
import {
  buildFallbackInfographicTitle,
  normalizeInfographicTitleCandidate,
  resolveInfographicTitle,
  selectOriginalTitlePrompt,
  UNTITLED_INFOGRAPHIC_TITLE,
} from '../title-utils';

describe('title-utils', () => {
  it('selects the earliest non-empty version prompt as original query', () => {
    const prompt = selectOriginalTitlePrompt({
      currentPrompt: 'Make it more minimal',
      existingVersions: [
        { prompt: 'Create an infographic about ecommerce growth' },
        { prompt: 'Increase contrast in the header' },
      ],
    });

    expect(prompt).toBe('Create an infographic about ecommerce growth');
  });

  it('falls back to current prompt when no historical prompt exists', () => {
    const prompt = selectOriginalTitlePrompt({
      currentPrompt: 'Compare marketing channels by ROI',
      existingVersions: [{ prompt: '   ' }, { prompt: null }],
    });

    expect(prompt).toBe('Compare marketing channels by ROI');
  });

  it('builds deterministic fallback title from source prompt', () => {
    const title = buildFallbackInfographicTitle(
      'Create an infographic about quarterly growth in ecommerce subscriptions',
    );

    expect(title).toBe('Quarterly Growth in Ecommerce Subscriptions');
  });

  it('returns generic fallback title for empty prompt', () => {
    const title = buildFallbackInfographicTitle('   ');
    expect(title).toBe('Infographic Overview');
  });

  it('normalizes noisy model candidate titles', () => {
    const title = normalizeInfographicTitleCandidate(
      '  "Revenue Pulse Dashboard."  ',
    );
    expect(title).toBe('Revenue Pulse Dashboard');
  });

  it('falls back when model returns untitled title', () => {
    const title = resolveInfographicTitle(
      UNTITLED_INFOGRAPHIC_TITLE,
      'Create an infographic about product adoption trends',
    );
    expect(title).toBe('Product Adoption Trends');
  });
});
