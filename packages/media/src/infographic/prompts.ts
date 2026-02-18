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
// Prompt Builder
// =============================================================================

export function buildInfographicPrompt(options: BuildPromptOptions): string {
  const { isEdit, prompt, styleProperties } = options;
  const parts: string[] = [];

  if (isEdit) {
    parts.push(
      'The attached image is an existing infographic. Modify it according to the instructions below. Preserve the overall layout, typography, and color scheme unless the instructions say otherwise.',
    );
    parts.push(`Edit instructions: ${prompt}`);
  } else {
    parts.push(`User's prompt: ${prompt}`);
  }

  if (styleProperties.length > 0) {
    const lines = styleProperties.map((p) => `- ${p.key}: ${p.value}`);
    parts.push(`Visual style parameters:\n${lines.join('\n')}`);
  }

  const dims = FORMAT_DIMENSIONS[options.format];
  parts.push(
    `Generate at ${dims.width}x${dims.height} pixels (${dims.label}). Optimize layout for this aspect ratio.`,
  );

  parts.push(
    'Create a professional, clear, and visually appealing infographic. Ensure all text is legible and the layout is well-organized.',
  );

  return parts.join('\n\n');
}
