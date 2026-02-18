import type {
  InfographicType,
  InfographicStyle,
  InfographicFormat,
} from '@repo/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface BuildPromptOptions {
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
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
// Type Directives
// =============================================================================

const TYPE_DIRECTIVES: Record<InfographicType, string> = {
  timeline:
    'Create an infographic showing a chronological timeline. Arrange events along a visual timeline with dates, descriptions, and icons. Use a clear flow direction.',
  comparison:
    'Create a comparison infographic with items shown side-by-side. Use columns or dividers to separate each item. Include matching categories for easy comparison.',
  stats_dashboard:
    'Create a statistics dashboard infographic. Visualize data using charts, large numbers, and icons. Highlight key metrics prominently.',
  key_takeaways:
    'Create a key takeaways infographic. Present the most important points as a numbered visual list with icons. Use clear hierarchy.',
};

// =============================================================================
// Style Modifiers
// =============================================================================

const STYLE_MODIFIERS: Record<InfographicStyle, string> = {
  modern_minimal:
    'Style: Clean lines, generous whitespace, neutral palette (black, white, gray, one accent color), sans-serif typography.',
  bold_colorful:
    'Style: Vibrant colors, strong contrast, large text, energetic layout, dynamic shapes.',
  corporate:
    'Style: Professional palette (navy, gray, white), structured grid, restrained decoration, clear data presentation.',
  playful:
    'Style: Rounded shapes, bright warm colors, hand-drawn style elements, friendly typography.',
  dark_mode:
    'Style: Dark background, light text, neon/bright accent colors, modern feel.',
  editorial:
    'Style: Magazine-inspired layout, sophisticated typography, muted color palette, elegant spacing.',
};

// =============================================================================
// Prompt Builder
// =============================================================================

export function buildInfographicPrompt(options: BuildPromptOptions): string {
  const { isEdit, prompt } = options;
  const parts: string[] = [];

  if (isEdit) {
    parts.push(
      'The attached image is an existing infographic. Modify it according to the instructions below. Preserve the overall layout, typography, and color scheme unless the instructions say otherwise.',
    );
    parts.push(`Edit instructions: ${prompt}`);
  } else {
    parts.push(TYPE_DIRECTIVES[options.infographicType]);
    parts.push(`User's prompt: ${prompt}`);
  }

  parts.push(STYLE_MODIFIERS[options.stylePreset]);

  const dims = FORMAT_DIMENSIONS[options.format];
  parts.push(
    `Generate at ${dims.width}x${dims.height} pixels (${dims.label}). Optimize layout for this aspect ratio.`,
  );

  parts.push(
    'Create a professional, clear, and visually appealing infographic. Ensure all text is legible and the layout is well-organized.',
  );

  return parts.join('\n\n');
}
