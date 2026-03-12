import { describe, it, expect } from 'vitest';
import { buildInfographicPrompt, FORMAT_DIMENSIONS } from '../prompts';

describe('buildInfographicPrompt', () => {
  it('includes structured task, content, and style guidance in first generation', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Create a timeline of company history',
    });

    expect(result).toContain('TASK\nCreate a finished infographic image.');
    expect(result).toContain('CONTENT TO VISUALIZE:');
    expect(result).toContain('Create a timeline of company history');
    expect(result).toContain('NANO BANANA GENERATION FRAMEWORK');
    expect(result).toContain('Subject: identify the core topic');
    expect(result).toContain('DESIGN REQUIREMENTS');
    expect(result).toContain('Use positive, explicit visual framing');
    expect(result).toContain('Do not invent statistics');
    expect(result).toContain('STYLE DIRECTIVES');
    expect(result).toContain(
      '- Style: Infographic — data-driven visual summary',
    );
    expect(result).toContain('OUTPUT FORMAT');
    expect(result).toContain('Optimize the composition for a 9:16 canvas');
  });

  it('groups style properties into semantic sections', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        { key: 'Background', value: '#1a1a2e', type: 'color' },
        { key: 'Accent', value: '#ff6b6b', type: 'color' },
        {
          key: 'Layout',
          value: 'Three stacked comparison bands',
          type: 'text',
        },
        { key: 'Mood', value: 'professional', type: 'text' },
      ],
      format: 'portrait',
      prompt: 'Company report',
    });

    expect(result).toContain('STYLE DIRECTIVES');
    expect(result).toContain('Layout and composition:');
    expect(result).toContain('- Layout: Three stacked comparison bands');
    expect(result).toContain('Palette and materials:');
    expect(result).toContain('- Background: Use exact color #1a1a2e');
    expect(result).toContain('- Accent: Use exact color #ff6b6b');
    expect(result).toContain('Tone and finishing details:');
    expect(result).toContain('- Mood: professional');
  });

  it('formats color properties with exact-color instruction', () => {
    const result = buildInfographicPrompt({
      styleProperties: [{ key: 'Primary', value: '#0050ff', type: 'color' }],
      format: 'square',
      prompt: 'test',
    });

    expect(result).toContain('Palette and materials:');
    expect(result).toContain('- Primary: Use exact color #0050ff');
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
      'These instructions override generic aesthetic defaults',
    );
  });

  it('defaults to infographic style when no properties are provided', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Test',
    });

    expect(result).toContain('STYLE DIRECTIVES');
    expect(result).toContain('Visual system:');
    expect(result).toContain(
      '- Style: Infographic — data-driven visual summary',
    );
  });

  it('adds the default infographic style when other style directives omit content type', () => {
    const result = buildInfographicPrompt({
      styleProperties: [{ key: 'Tone', value: 'Analytical', type: 'text' }],
      format: 'portrait',
      prompt: 'Test',
    });

    expect(result).toContain(
      '- Style: Infographic — data-driven visual summary',
    );
    expect(result).toContain('- Tone: Analytical');
  });

  it('does not add the default infographic style when a custom style is provided', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        {
          key: 'Style',
          value: 'Social media card — punchy, visual-first, shareable',
          type: 'text',
        },
      ],
      format: 'portrait',
      prompt: 'Test',
    });

    expect(result).toContain(
      '- Style: Social media card — punchy, visual-first, shareable',
    );
    expect(result).not.toContain(
      '- Style: Infographic — data-driven visual summary',
    );
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

    expect(result).toContain('TASK\nEdit the attached infographic image.');
    expect(result).toContain('EDIT REQUIREMENTS');
    expect(result).toContain('NANO BANANA EDIT FRAMEWORK');
    expect(result).toContain(
      'Treat the attached image as the current source of truth',
    );
    expect(result).toContain(
      'let the style directives below control the updated visual system',
    );
    expect(result).toContain('REQUESTED CHANGES:');
    expect(result).toContain('Make the title bigger');
    expect(result).not.toContain('CONTENT TO VISUALIZE:');
    expect(result).toContain('- Accent: Use exact color #ff0000');
  });

  it('uses conservative edit guidance when isEdit without styles', () => {
    const result = buildInfographicPrompt({
      styleProperties: [],
      format: 'portrait',
      prompt: 'Make the title bigger',
      isEdit: true,
    });

    expect(result).toContain(
      'Preserve the existing layout, color relationships, typography hierarchy, and visual language',
    );
    expect(result).not.toContain('STYLE DIRECTIVES');
    expect(result).not.toContain(
      '- Style: Infographic — data-driven visual summary',
    );
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

    expect(result).toContain('Palette and materials:');
    expect(result).toContain('- Background: Use exact color #0a0a0f');
    expect(result).toContain('- Glow Color: Use exact color #ff00ff');
    expect(result).toContain('Layout and composition:');
    expect(result).toContain('- Columns: 3');
    expect(result).toContain('Typography and copy treatment:');
    expect(result).toContain('- Typography: Uppercase, wide letter-spacing');
    expect(result).toContain('Tone and finishing details:');
    expect(result).toContain('- Mood: Blade Runner meets data');
    expect(result).toContain('STYLE DIRECTIVES');
    expect(result).toContain('override generic aesthetic defaults');
  });

  it('keeps unmatched style keys instead of dropping them', () => {
    const result = buildInfographicPrompt({
      styleProperties: [
        { key: 'Brand Signal', value: 'Ownable campaign marker', type: 'text' },
      ],
      format: 'portrait',
      prompt: 'Launch campaign card',
    });

    expect(result).toContain('Additional directives:');
    expect(result).toContain('- Brand Signal: Ownable campaign marker');
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
      aspectRatio: '9:16',
    });
  });

  it('has correct square dimensions', () => {
    expect(FORMAT_DIMENSIONS.square).toEqual({
      width: 1080,
      height: 1080,
      label: 'Square (1080×1080)',
      aspectRatio: '1:1',
    });
  });

  it('has correct landscape dimensions', () => {
    expect(FORMAT_DIMENSIONS.landscape).toEqual({
      width: 1920,
      height: 1080,
      label: 'Landscape (1920×1080)',
      aspectRatio: '16:9',
    });
  });

  it('has correct og_card dimensions', () => {
    expect(FORMAT_DIMENSIONS.og_card).toEqual({
      width: 1200,
      height: 630,
      label: 'OG Card (1200×630)',
      aspectRatio: '1.91:1',
    });
  });
});
