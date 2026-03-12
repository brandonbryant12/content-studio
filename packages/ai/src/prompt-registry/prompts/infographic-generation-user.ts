import type { InfographicFormat, StyleProperty } from '@repo/db/schema';
import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

const VALID_STYLE_TYPES: ReadonlySet<NonNullable<StyleProperty['type']>> =
  new Set(['text', 'color', 'number']);
const CONTENT_TYPE_KEYS = new Set(['style', 'content type']);
const DEFAULT_INFOGRAPHIC_STYLE_PROPERTY: StyleProperty = {
  key: 'Style',
  value: 'Infographic — data-driven visual summary',
  type: 'text',
};
const STYLE_SECTION_LABELS = [
  'Visual system',
  'Layout and composition',
  'Camera and perspective',
  'Lighting and depth',
  'Palette and materials',
  'Typography and copy treatment',
  'Charts, icons, and illustration',
  'Tone and finishing details',
  'Additional directives',
] as const;

type StyleSectionLabel = (typeof STYLE_SECTION_LABELS)[number];

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

const hasContentTypeProperty = (properties: readonly StyleProperty[]) =>
  properties.some((property) =>
    CONTENT_TYPE_KEYS.has(property.key.trim().toLowerCase()),
  );

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

const normalizeStyleKey = (key: string) => key.trim().toLowerCase();

const matchesAnyKeyword = (key: string, keywords: readonly string[]): boolean =>
  keywords.some((keyword) => key.includes(keyword));

const getStyleSection = (property: StyleProperty): StyleSectionLabel => {
  const key = normalizeStyleKey(property.key);

  if (
    CONTENT_TYPE_KEYS.has(key) ||
    matchesAnyKeyword(key, ['visual style', 'visual_system']) ||
    key === 'style'
  ) {
    return 'Visual system';
  }

  if (
    matchesAnyKeyword(key, [
      'layout',
      'composition',
      'grid',
      'frame',
      'framing',
      'column',
      'row',
      'spacing',
      'alignment',
      'structure',
      'hierarchy',
      'flow',
      'module',
      'section',
    ])
  ) {
    return 'Layout and composition';
  }

  if (
    matchesAnyKeyword(key, [
      'camera',
      'lens',
      'perspective',
      'angle',
      'view',
      'shot',
      'isometric',
      'macro',
      'aerial',
      'wide',
    ])
  ) {
    return 'Camera and perspective';
  }

  if (
    matchesAnyKeyword(key, [
      'lighting',
      'light',
      'shadow',
      'depth',
      'focus',
      'exposure',
      'glow',
      'atmosphere',
      'ambient',
      'highlight',
    ])
  ) {
    return 'Lighting and depth';
  }

  if (
    property.type === 'color' ||
    matchesAnyKeyword(key, [
      'palette',
      'color',
      'background',
      'accent',
      'gradient',
      'grade',
      'grading',
      'film',
      'stock',
      'stroke',
      'fill',
      'border',
      'material',
      'surface',
    ])
  ) {
    return 'Palette and materials';
  }

  if (
    matchesAnyKeyword(key, [
      'typography',
      'font',
      'headline',
      'heading',
      'subhead',
      'letter',
      'label',
      'caption',
      'copy',
      'text',
    ])
  ) {
    return 'Typography and copy treatment';
  }

  if (
    matchesAnyKeyword(key, [
      'chart',
      'graph',
      'data viz',
      'visualization',
      'diagram',
      'icon',
      'illustration',
      'pictogram',
      'shape',
    ])
  ) {
    return 'Charts, icons, and illustration';
  }

  if (
    matchesAnyKeyword(key, [
      'tone',
      'mood',
      'vibe',
      'texture',
      'effect',
      'finish',
      'shadow',
      'grain',
      'contrast',
    ])
  ) {
    return 'Tone and finishing details';
  }

  return 'Additional directives';
};

function buildStyleSection(properties: readonly StyleProperty[]): string {
  const grouped = new Map<StyleSectionLabel, StyleProperty[]>();

  for (const label of STYLE_SECTION_LABELS) {
    grouped.set(label, []);
  }

  for (const property of properties) {
    grouped.get(getStyleSection(property))?.push(property);
  }

  const lines: string[] = [
    'STYLE DIRECTIVES',
    'Apply every directive below. These instructions override generic aesthetic defaults and define the visual system for the final image.',
  ];

  for (const label of STYLE_SECTION_LABELS) {
    const section = grouped.get(label);
    if (!section || section.length === 0) {
      continue;
    }

    lines.push('');
    lines.push(`${label}:`);
    for (const property of section) {
      lines.push(formatStyleProperty(property));
    }
  }

  lines.push('');
  lines.push(
    'Carry these directives through color, layout, typography, icon treatment, texture, and overall mood wherever relevant.',
  );
  return lines.join('\n');
}

const buildQuotedBlock = (label: string, value: string) =>
  `${label}:\n"""\n${value.trim()}\n"""`;

const buildGenerationRequirements = () =>
  [
    'NANO BANANA GENERATION FRAMEWORK',
    '- Subject: identify the core topic, objects, metrics, icons, and labels that must appear.',
    '- Action: show the requested message directly, such as compare, explain, rank, sequence, summarize, or reveal change over time.',
    '- Context: use any provided setting, brand environment, or audience cues; otherwise keep the infographic self-contained and editorially clean.',
    '- Composition: create a clear reading path, strong focal point, deliberate spacing, and section hierarchy for the requested canvas shape.',
    '- Style: apply the style directives below across typography, charts, color, texture, materiality, and finishing details.',
    '',
    'DESIGN REQUIREMENTS',
    '- Use positive, explicit visual framing for the intended end state.',
    '- Treat the result as a finished infographic, not a decorative illustration or photographed mockup.',
    '- Use only the content the user supplied. Do not invent statistics, dates, quotes, claims, labels, or explanatory copy.',
    '- If the request is broad or missing specifics, build a strong infographic layout and use short neutral placeholders like "[Metric]" or "[Label]" instead of fabricated facts.',
    '- Prioritize scannable hierarchy: one clear focal point, grouped sections, concise labels, generous whitespace, and legible typography.',
    '- Keep on-image text short. Prefer headlines, labels, captions, and callouts over dense paragraphs.',
    '- If the user provides exact words in quotation marks, render those words verbatim and keep them legible.',
    '- Treat typography directions as concrete text-rendering instructions, not loose mood-board suggestions.',
  ].join('\n');

const buildEditRequirements = (hasStyles: boolean) =>
  [
    'NANO BANANA EDIT FRAMEWORK',
    '- Change only what the request targets.',
    '- Keep the untouched regions exactly consistent unless the request explicitly asks for a broader redesign.',
    '- Use the attached image as the composition and content reference for everything that should stay the same.',
    '',
    'EDIT REQUIREMENTS',
    '- Treat the attached image as the current source of truth.',
    '- Make only the requested changes and preserve everything else unless the instructions explicitly call for a broader redesign.',
    hasStyles
      ? '- Preserve the existing composition where possible, but let the style directives below control the updated visual system.'
      : '- Preserve the existing layout, color relationships, typography hierarchy, and visual language unless the edit request explicitly changes them.',
    '- If the edit introduces exact wording in quotation marks, render that text verbatim and keep the rest of the copy unchanged unless asked otherwise.',
    '- Keep the result as a finished infographic image, not a photographed poster, browser frame, or slide mockup.',
  ].join('\n');

const buildOutputSection = (format: InfographicFormat) => {
  const dims = INFOGRAPHIC_FORMAT_DIMENSIONS[format];

  return [
    'OUTPUT FORMAT',
    `- Generate at ${dims.width}x${dims.height} pixels (${dims.label}).`,
    `- Optimize the composition for a ${dims.aspectRatio} canvas.`,
    '- Compose specifically for this aspect ratio and use the full canvas intentionally.',
  ].join('\n');
};

export interface InfographicGenerationPromptInput {
  readonly styleProperties: readonly StyleProperty[];
  readonly format: InfographicFormat;
  readonly prompt: string;
  readonly isEdit?: boolean;
}

export const INFOGRAPHIC_FORMAT_DIMENSIONS: Record<
  InfographicFormat,
  { width: number; height: number; label: string; aspectRatio: string }
> = {
  portrait: {
    width: 1080,
    height: 1920,
    label: 'Portrait (1080×1920)',
    aspectRatio: '9:16',
  },
  square: {
    width: 1080,
    height: 1080,
    label: 'Square (1080×1080)',
    aspectRatio: '1:1',
  },
  landscape: {
    width: 1920,
    height: 1080,
    label: 'Landscape (1920×1080)',
    aspectRatio: '16:9',
  },
  og_card: {
    width: 1200,
    height: 630,
    label: 'OG Card (1200×630)',
    aspectRatio: '1.91:1',
  },
};

export const infographicGenerationUserPrompt =
  definePrompt<InfographicGenerationPromptInput>({
    id: 'infographic.generate.user',
    version: 4,
    owner: PROMPT_OWNER,
    domain: 'infographic',
    role: 'user',
    modelType: 'image-gen',
    riskTier: 'high',
    status: 'active',
    summary:
      'Builds structured infographic image-generation instructions for first-pass or iterative design.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Supports persisted style directives and reference-image edits; sanitize key/value style properties before prompt composition.',
    }),
    render: (input) => {
      const { isEdit, prompt, styleProperties } = input;
      const sanitizedStyles = sanitizeStyleProperties(styleProperties);
      const effectiveStyles = isEdit
        ? sanitizedStyles
        : hasContentTypeProperty(sanitizedStyles)
          ? sanitizedStyles
          : [DEFAULT_INFOGRAPHIC_STYLE_PROPERTY, ...sanitizedStyles];
      const hasStyles = effectiveStyles.length > 0;
      const parts: string[] = [];

      if (isEdit) {
        parts.push('TASK\nEdit the attached infographic image.');
        parts.push(buildEditRequirements(hasStyles));
        parts.push(buildQuotedBlock('REQUESTED CHANGES', prompt));
      } else {
        parts.push('TASK\nCreate a finished infographic image.');
        parts.push(buildQuotedBlock('CONTENT TO VISUALIZE', prompt));
        parts.push(buildGenerationRequirements());
      }

      if (hasStyles) {
        parts.push(buildStyleSection(effectiveStyles));
      }

      parts.push(buildOutputSection(input.format));

      return parts.join('\n\n');
    },
  });
