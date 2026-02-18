import type { InfographicFormat, StyleProperty } from '@repo/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface BuildPromptOptions {
  styleProperties: StyleProperty[];
  format: InfographicFormat;
  /** User's prompt — describes what to create (first gen) or what to change (edit). */
  prompt: string;
  /** When true, a reference image is attached and the prompt is framed as an edit. */
  isEdit?: boolean;
}

export const FORMAT_DIMENSIONS: Record<
  InfographicFormat,
  { width: number; height: number; label: string }
> = {
  portrait: { width: 1080, height: 1920, label: 'Portrait (1080×1920)' },
  square: { width: 1080, height: 1080, label: 'Square (1080×1080)' },
  landscape: { width: 1920, height: 1080, label: 'Landscape (1920×1080)' },
  og_card: { width: 1200, height: 630, label: 'OG Card (1200×630)' },
};

// =============================================================================
// Style Property Formatting
// =============================================================================

function formatStyleProperty(prop: StyleProperty): string {
  switch (prop.type) {
    case 'color':
      return `- ${prop.key}: Use exact color ${prop.value}`;
    case 'number':
      return `- ${prop.key}: ${prop.value}`;
    default:
      return `- ${prop.key}: ${prop.value}`;
  }
}

function buildStyleSection(properties: StyleProperty[]): string {
  const colors = properties.filter((p) => p.type === 'color');
  const others = properties.filter((p) => p.type !== 'color');

  const lines: string[] = [];

  lines.push(
    'STYLE DIRECTIVES — Follow these strictly. They define the visual identity of this infographic.',
  );

  if (colors.length > 0) {
    lines.push('');
    lines.push('Color palette (use these exact colors):');
    for (const c of colors) {
      lines.push(`  ${c.key}: ${c.value}`);
    }
  }

  if (others.length > 0) {
    lines.push('');
    lines.push('Visual direction:');
    for (const o of others) {
      lines.push(formatStyleProperty(o));
    }
  }

  lines.push('');
  lines.push(
    'These style parameters take priority over default aesthetic choices. Let them drive the color palette, texture, typography feel, and overall mood of the design.',
  );

  return lines.join('\n');
}

// =============================================================================
// Prompt Builder
// =============================================================================

export function buildInfographicPrompt(options: BuildPromptOptions): string {
  const { isEdit, prompt, styleProperties } = options;
  const hasStyles = styleProperties.length > 0;
  const parts: string[] = [];

  if (isEdit) {
    const editPreamble = hasStyles
      ? 'The attached image is an existing infographic. Modify it according to the instructions below. Preserve the overall layout unless the instructions say otherwise. Apply the style directives provided.'
      : 'The attached image is an existing infographic. Modify it according to the instructions below. Preserve the overall layout, typography, and color scheme unless the instructions say otherwise.';
    parts.push(editPreamble);
    parts.push(`Edit instructions: ${prompt}`);
  } else {
    parts.push(
      'You are designing an infographic. Create a visually compelling, well-organized design with clear hierarchy and legible text.',
    );
    parts.push(`Content direction: ${prompt}`);
  }

  if (hasStyles) {
    parts.push(buildStyleSection(styleProperties));
  }

  const dims = FORMAT_DIMENSIONS[options.format];
  parts.push(
    `Generate at ${dims.width}x${dims.height} pixels (${dims.label}). Optimize layout for this aspect ratio.`,
  );

  return parts.join('\n\n');
}
