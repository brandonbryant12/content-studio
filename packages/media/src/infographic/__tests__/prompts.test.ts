import { describe, it, expect } from 'vitest';
import { buildInfographicPrompt, FORMAT_DIMENSIONS } from '../prompts';

describe('buildInfographicPrompt', () => {
  it('includes system preamble and user prompt in first generation', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Create a timeline of company history',
    });

    expect(result).toContain('You are designing an image');
    expect(result).toContain('Do not invent statistics');
    expect(result).toContain(
      'Content direction: Create a timeline of company history',
    );
  });

  it('groups color properties into a dedicated palette section', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        { key: 'Background', value: '#1a1a2e', type: 'color' },
        { key: 'Accent', value: '#ff6b6b', type: 'color' },
        { key: 'Mood', value: 'professional', type: 'text' },
      ],
      format: 'portrait',
      prompt: 'Company report',
    });

    expect(result).toContain('STYLE DIRECTIVES');
    expect(result).toContain('Color palette (use these exact colors):');
    expect(result).toContain('Background: #1a1a2e');
    expect(result).toContain('Accent: #ff6b6b');
    expect(result).toContain('Visual direction:');
    expect(result).toContain('- Mood: professional');
  });

  it('formats color properties with exact-color instruction', () => {
    const result = buildInfographicPrompt({
      styleProperties: [{ key: 'Primary', value: '#0050ff', type: 'color' }],
      format: 'square',
      prompt: 'test',
    });

    expect(result).toContain('Color palette (use these exact colors):');
    expect(result).toContain('Primary: #0050ff');
  });

  it('includes priority instruction when style properties present', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        { key: 'Vibe', value: 'retro punk zine', type: 'text' },
      ],
      format: 'portrait',
      prompt: 'test',
    });

    expect(result).toContain(
      'These style parameters take priority over default aesthetic choices',
    );
  });

  it('omits style section when no properties', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Test',
    });

    expect(result).not.toContain('STYLE DIRECTIVES');
    expect(result).not.toContain('Color palette');
    expect(result).not.toContain('Visual direction');
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

  it('uses edit framing with style-aware preamble when isEdit with styles', () => {
    const result = buildInfographicPrompt({
      styleProperties: [{ key: 'Accent', value: '#ff0000', type: 'color' }],
      format: 'portrait',
      prompt: 'Make the title bigger',
      isEdit: true,
    });

    expect(result).toContain('current design');
    expect(result).toContain('Apply the style directives provided');
    expect(result).not.toContain(
      'Preserve the overall layout, typography, and color scheme',
    );
    expect(result).toContain('Edit instructions: Make the title bigger');
    expect(result).not.toContain('Content direction:');
    expect(result).toContain('Accent: #ff0000');
  });

  it('uses conservative edit preamble when isEdit without styles', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Make the title bigger',
      isEdit: true,
    });

    expect(result).toContain(
      'Preserve the overall layout, typography, and color scheme',
    );
    expect(result).not.toContain('Apply the style directives');
  });

  it('handles mixed property types correctly', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        { key: 'Background', value: '#0a0a0f', type: 'color' },
        { key: 'Glow Color', value: '#ff00ff', type: 'color' },
        { key: 'Columns', value: '3', type: 'number' },
        {
          key: 'Typography',
          value: 'Uppercase, wide letter-spacing',
          type: 'text',
        },
        { key: 'Mood', value: 'Blade Runner meets data', type: 'text' },
      ],
      format: 'landscape',
      prompt: 'Cyberpunk data dashboard',
    });

    // Colors grouped together
    expect(result).toContain('Background: #0a0a0f');
    expect(result).toContain('Glow Color: #ff00ff');
    // Non-colors grouped together
    expect(result).toContain('- Columns: 3');
    expect(result).toContain('- Typography: Uppercase, wide letter-spacing');
    expect(result).toContain('- Mood: Blade Runner meets data');
    // Structure
    expect(result).toContain('STYLE DIRECTIVES');
    expect(result).toContain('take priority over default aesthetic choices');
  });

  it('does not include generic "professional" instruction', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        { key: 'Vibe', value: 'chaotic punk zine aesthetic', type: 'text' },
      ],
      format: 'portrait',
      prompt: 'Concert lineup poster',
    });

    // The old generic footer should not appear — the style directives drive the aesthetic
    expect(result).not.toContain(
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
