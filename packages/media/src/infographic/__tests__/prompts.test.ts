import { describe, it, expect } from 'vitest';
import { buildInfographicPrompt, FORMAT_DIMENSIONS } from '../prompts';

describe('buildInfographicPrompt', () => {
  it('includes type directive for timeline', () => {
    const result = buildInfographicPrompt({
      infographicType: 'timeline',
      stylePreset: 'modern_minimal',
      format: 'portrait',
      prompt: 'Company history',
    });

    expect(result).toContain('chronological timeline');
    expect(result).toContain('Company history');
  });

  it('includes type directive for comparison', () => {
    const result = buildInfographicPrompt({
      infographicType: 'comparison',
      stylePreset: 'corporate',
      format: 'landscape',
      prompt: 'Product A vs B',
    });

    expect(result).toContain('comparison');
    expect(result).toContain('side-by-side');
    expect(result).toContain('Product A vs B');
  });

  it('includes type directive for stats_dashboard', () => {
    const result = buildInfographicPrompt({
      infographicType: 'stats_dashboard',
      stylePreset: 'bold_colorful',
      format: 'square',
      prompt: 'Q4 metrics',
    });

    expect(result).toContain('statistics dashboard');
    expect(result).toContain('Q4 metrics');
  });

  it('includes type directive for key_takeaways', () => {
    const result = buildInfographicPrompt({
      infographicType: 'key_takeaways',
      stylePreset: 'playful',
      format: 'portrait',
      prompt: 'Meeting summary',
    });

    expect(result).toContain('key takeaways');
    expect(result).toContain('Meeting summary');
  });

  it('includes style modifier for each preset', () => {
    const styles = [
      { preset: 'modern_minimal', keyword: 'whitespace' },
      { preset: 'bold_colorful', keyword: 'Vibrant' },
      { preset: 'corporate', keyword: 'Professional' },
      { preset: 'playful', keyword: 'Rounded' },
      { preset: 'dark_mode', keyword: 'Dark background' },
      { preset: 'editorial', keyword: 'Magazine' },
    ] as const;

    for (const { preset, keyword } of styles) {
      const result = buildInfographicPrompt({
        infographicType: 'key_takeaways',
        stylePreset: preset,
        format: 'portrait',
        prompt: 'test',
      });

      expect(result).toContain(keyword);
    }
  });

  it('includes correct format dimensions', () => {
    const formats = ['portrait', 'square', 'landscape', 'og_card'] as const;

    for (const format of formats) {
      const result = buildInfographicPrompt({
        infographicType: 'timeline',
        stylePreset: 'modern_minimal',
        format,
        prompt: 'test',
      });

      const dims = FORMAT_DIMENSIONS[format];
      expect(result).toContain(`${dims.width}x${dims.height}`);
    }
  });

  it('uses edit framing when isEdit is true', () => {
    const result = buildInfographicPrompt({
      infographicType: 'key_takeaways',
      stylePreset: 'modern_minimal',
      format: 'portrait',
      prompt: 'Make the title bigger',
      isEdit: true,
    });

    expect(result).toContain('existing infographic');
    expect(result).toContain('Edit instructions: Make the title bigger');
    expect(result).not.toContain('key takeaways');
  });

  it('includes user prompt in first generation', () => {
    const result = buildInfographicPrompt({
      infographicType: 'key_takeaways',
      stylePreset: 'modern_minimal',
      format: 'portrait',
      prompt: 'Generic prompt',
    });

    expect(result).toContain("User's prompt: Generic prompt");
  });
});

describe('FORMAT_DIMENSIONS', () => {
  it('has correct portrait dimensions', () => {
    expect(FORMAT_DIMENSIONS.portrait).toEqual({
      width: 1080,
      height: 1920,
      label: 'Portrait (1080×1920)',
    });
  });

  it('has correct square dimensions', () => {
    expect(FORMAT_DIMENSIONS.square).toEqual({
      width: 1080,
      height: 1080,
      label: 'Square (1080×1080)',
    });
  });

  it('has correct landscape dimensions', () => {
    expect(FORMAT_DIMENSIONS.landscape).toEqual({
      width: 1920,
      height: 1080,
      label: 'Landscape (1920×1080)',
    });
  });

  it('has correct og_card dimensions', () => {
    expect(FORMAT_DIMENSIONS.og_card).toEqual({
      width: 1200,
      height: 630,
      label: 'OG Card (1200×630)',
    });
  });
});
