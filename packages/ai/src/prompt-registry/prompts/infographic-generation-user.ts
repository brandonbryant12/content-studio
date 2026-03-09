import type { InfographicFormat, StyleProperty } from '@repo/db/schema';
import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

const VALID_STYLE_TYPES: ReadonlySet<NonNullable<StyleProperty['type']>> =
  new Set(['text', 'color', 'number']);

const normalizeStyleType = (
  type: StyleProperty['type'],
): NonNullable<StyleProperty['type']> | undefined => {
  if (type && VALID_STYLE_TYPES.has(type)) {
    return type;
  }
  return undefined;
};

const sanitizeStyleProperty = (
  property: StyleProperty,
): StyleProperty | null => {
  const key = property.key.trim();
  const value = property.value.trim();

  if (!key || !value) {
    return null;
  }

  const type = normalizeStyleType(property.type);
  return type ? { key, value, type } : { key, value };
};

const sanitizeStyleProperties = (
  properties: readonly StyleProperty[],
): StyleProperty[] => {
  const result: StyleProperty[] = [];

  for (const property of properties) {
    const sanitized = sanitizeStyleProperty(property);
    if (sanitized) {
      result.push(sanitized);
    }
  }

  return result;
};

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
    'STYLE DIRECTIVES - Follow these strictly. They define the visual identity of this infographic.',
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

export interface InfographicGenerationPromptInput {
  readonly styleProperties: readonly StyleProperty[];
  readonly format: InfographicFormat;
  readonly prompt: string;
  readonly isEdit?: boolean;
}

export const INFOGRAPHIC_FORMAT_DIMENSIONS: Record<
  InfographicFormat,
  { width: number; height: number; label: string }
> = {
  portrait: { width: 1080, height: 1920, label: 'Portrait (1080×1920)' },
  square: { width: 1080, height: 1080, label: 'Square (1080×1080)' },
  landscape: { width: 1920, height: 1080, label: 'Landscape (1920×1080)' },
  og_card: { width: 1200, height: 630, label: 'OG Card (1200×630)' },
};

export const infographicGenerationUserPrompt =
  definePrompt<InfographicGenerationPromptInput>({
    id: 'infographic.generate.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'infographic',
    role: 'user',
    modelType: 'image-gen',
    riskTier: 'high',
    status: 'active',
    summary:
      'Builds image-generation instructions for first-pass or iterative infographic design.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Supports persisted style directives; sanitize key/value style properties before prompt composition.',
    }),
    render: (input) => {
      const { isEdit, prompt, styleProperties } = input;
      const sanitizedStyles = sanitizeStyleProperties(styleProperties);
      const hasStyles = sanitizedStyles.length > 0;
      const parts: string[] = [];

      if (isEdit) {
        const editPreamble = hasStyles
          ? 'The attached image is the current design. Modify it according to the instructions below. Preserve the overall layout unless the instructions say otherwise. Apply the style directives provided.'
          : 'The attached image is the current design. Modify it according to the instructions below. Preserve the overall layout, typography, and color scheme unless the instructions say otherwise.';
        parts.push(editPreamble);
        parts.push(`Edit instructions: ${prompt}`);
      } else {
        parts.push(
          'You are designing an image. Use only the content and data the user provides below. Do not invent statistics, quotes, bullet points, or filler text. If the user gives a topic without specifics, create a visual layout with clear placeholder labels (e.g. "[Your metric here]") rather than fabricating content. Keep text minimal — prefer visuals, icons, and whitespace over dense paragraphs.',
        );
        parts.push(`Content direction: ${prompt}`);
      }

      if (hasStyles) {
        parts.push(buildStyleSection(sanitizedStyles));
      }

      const dims = INFOGRAPHIC_FORMAT_DIMENSIONS[input.format];
      parts.push(
        `Generate at ${dims.width}x${dims.height} pixels (${dims.label}). Optimize layout for this aspect ratio.`,
      );

      return parts.join('\n\n');
    },
  });
