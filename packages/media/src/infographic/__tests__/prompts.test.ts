import { describe, it, expect } from 'vitest';
import { buildInfographicPrompt, FORMAT_DIMENSIONS } from '../prompts';

describe('buildInfographicPrompt', () => {
  it('includes user prompt in first generation', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Create a timeline of company history',
    });

    expect(result).toContain(
      "User's prompt: Create a timeline of company history",
    );
  });

  it('serializes style properties as key-value pairs', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        { key: 'Background', value: '#1a1a2e', type: 'color' },
        { key: 'Mood', value: 'professional', type: 'text' },
        { key: 'Font Size', value: '16', type: 'number' },
      ],
      format: 'portrait',
      prompt: 'Company report',
    });

    expect(result).toContain('Visual style parameters:');
    expect(result).toContain('- Background: #1a1a2e');
    expect(result).toContain('- Mood: professional');
    expect(result).toContain('- Font Size: 16');
  });

  it('omits style section when no properties', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Test',
    });

    expect(result).not.toContain('Visual style parameters');
  });

  it('includes correct format dimensions', () => {
    const formats = ['portrait', 'square', 'landscape', 'og_card'] as const;

    for (const format of formats) {
      const result = buildInfographicPrompt({
        styleProperties: [],
        format,
        prompt: 'test',
      });

      const dims = FORMAT_DIMENSIONS[format];
      expect(result).toContain(`${dims.width}x${dims.height}`);
    }
  });

  it('uses edit framing when isEdit is true', () => {
    const result = buildInfographicPrompt({
      styleProperties: [{ key: 'Accent', value: '#ff0000', type: 'color' }],
      format: 'portrait',
      prompt: 'Make the title bigger',
      isEdit: true,
    });

    expect(result).toContain('existing infographic');
    expect(result).toContain('Edit instructions: Make the title bigger');
    expect(result).not.toContain("User's prompt:");
    // Style properties should still be included in edits
    expect(result).toContain('- Accent: #ff0000');
  });

  it('includes closing quality instruction', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'test',
    });

    expect(result).toContain(
      'Create a professional, clear, and visually appealing infographic',
    );
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
