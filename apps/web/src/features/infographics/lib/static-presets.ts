import type { StyleProperty } from '../hooks/use-infographic-settings';

interface StaticInfographicPreset {
  id: string;
  name: string;
  description: string;
  category: 'layout' | 'palette' | 'tone' | 'extras';
  properties: StyleProperty[];
}

export const STATIC_INFOGRAPHIC_PRESETS: readonly StaticInfographicPreset[] = [
  // Layout presets
  {
    id: 'layout-grid-dashboard',
    name: 'Grid Dashboard',
    description: 'Dense modular grid with grouped metric cards',
    category: 'layout',
    properties: [
      {
        key: 'layout',
        value:
          'Dense grid of cards/modules — group related metrics together, use consistent card sizing with clear visual separation',
      },
    ],
  },
  {
    id: 'layout-hero-flow',
    name: 'Hero Flow',
    description: 'Bold headline, then supporting evidence below',
    category: 'layout',
    properties: [
      {
        key: 'layout',
        value:
          'Large hero statement or key insight at the top, followed by 2-3 supporting evidence sections stacked vertically',
      },
    ],
  },
  {
    id: 'layout-timeline',
    name: 'Timeline',
    description: 'Events or milestones in chronological order',
    category: 'layout',
    properties: [
      {
        key: 'layout',
        value:
          'Horizontal or vertical timeline with dated milestones — use a connecting line or spine between points, brief labels at each node',
      },
    ],
  },
  {
    id: 'layout-step-by-step',
    name: 'Step-by-Step',
    description: 'Numbered sequential walkthrough',
    category: 'layout',
    properties: [
      {
        key: 'layout',
        value:
          'Numbered steps flowing top-to-bottom — each step gets a clear heading, short body text, and optional icon or illustration',
      },
    ],
  },
  {
    id: 'layout-comparison',
    name: 'Side-by-Side',
    description: 'Two-column comparison or before/after',
    category: 'layout',
    properties: [
      {
        key: 'layout',
        value:
          'Two-column comparison layout — aligned rows for direct feature or metric comparison, shared labels on the left or center divider',
      },
    ],
  },
  {
    id: 'layout-pyramid',
    name: 'Funnel / Pyramid',
    description: 'Layered hierarchy narrowing top-to-bottom',
    category: 'layout',
    properties: [
      {
        key: 'layout',
        value:
          'Pyramid or funnel shape — widest category at top narrowing to most specific at bottom, each tier labeled with values and brief descriptions',
      },
    ],
  },

  // Palette presets
  {
    id: 'palette-midnight',
    name: 'Midnight',
    description: 'Dark, sophisticated, high contrast',
    category: 'palette',
    properties: [
      { key: 'background', value: '#0F172A', type: 'color' },
      {
        key: 'palette',
        value:
          'Cool grays and whites on deep navy — minimal color, maximum contrast',
      },
    ],
  },
  {
    id: 'palette-neon-pop',
    name: 'Neon Pop',
    description: 'Electric accents on dark backgrounds',
    category: 'palette',
    properties: [
      { key: 'background', value: '#0B1020', type: 'color' },
      { key: 'accent_color', value: '#00E5FF', type: 'color' },
      { key: 'secondary_accent', value: '#FF4FD8', type: 'color' },
      {
        key: 'palette',
        value:
          'Glowing neon accents on near-black — cyan and magenta as primaries, use sparingly for emphasis',
      },
    ],
  },
  {
    id: 'palette-earth',
    name: 'Earth & Warmth',
    description: 'Warm browns, greens, and amber tones',
    category: 'palette',
    properties: [
      { key: 'accent_color', value: '#B45309', type: 'color' },
      { key: 'secondary_accent', value: '#15803D', type: 'color' },
      {
        key: 'palette',
        value:
          'Warm and organic — amber, forest green, cream backgrounds, terracotta accents',
      },
    ],
  },
  {
    id: 'palette-ocean',
    name: 'Ocean Breeze',
    description: 'Cool blues and teals, calm and clean',
    category: 'palette',
    properties: [
      { key: 'accent_color', value: '#0891B2', type: 'color' },
      { key: 'secondary_accent', value: '#6366F1', type: 'color' },
      {
        key: 'palette',
        value:
          'Cool and calming — teal, sky blue, indigo accents on light or white backgrounds',
      },
    ],
  },
  {
    id: 'palette-candy',
    name: 'Candy Pastel',
    description: 'Soft, playful, light colors',
    category: 'palette',
    properties: [
      { key: 'accent_color', value: '#F472B6', type: 'color' },
      { key: 'secondary_accent', value: '#A78BFA', type: 'color' },
      {
        key: 'palette',
        value:
          'Soft pastels — pink, lavender, mint, peach on white or very light backgrounds',
      },
    ],
  },
  {
    id: 'palette-monochrome',
    name: 'Monochrome',
    description: 'One hue, many shades — clean and focused',
    category: 'palette',
    properties: [
      {
        key: 'palette',
        value:
          'Single-hue monochrome — pick one color and use its full range from lightest tint to darkest shade for all elements',
      },
    ],
  },
  {
    id: 'palette-sunset',
    name: 'Sunset Gradient',
    description: 'Warm gradients from coral to gold',
    category: 'palette',
    properties: [
      { key: 'accent_color', value: '#F97316', type: 'color' },
      { key: 'secondary_accent', value: '#EF4444', type: 'color' },
      {
        key: 'palette',
        value:
          'Warm gradient palette — coral, orange, gold, and deep rose blending into each other',
      },
    ],
  },
  {
    id: 'palette-corporate',
    name: 'Corporate Clean',
    description: 'Navy, slate, and a single restrained accent',
    category: 'palette',
    properties: [
      { key: 'accent_color', value: '#2563EB', type: 'color' },
      {
        key: 'palette',
        value:
          'Professional and restrained — navy, slate gray, white, with one blue accent for key elements',
      },
    ],
  },

  // Tone presets
  {
    id: 'tone-executive',
    name: 'Executive',
    description: 'Confident, concise, board-ready',
    category: 'tone',
    properties: [
      {
        key: 'tone',
        value:
          'Confident and concise — lead with conclusions, use precise language, no filler words, executive-ready',
      },
    ],
  },
  {
    id: 'tone-friendly',
    name: 'Friendly Guide',
    description: 'Warm, approachable, conversational',
    category: 'tone',
    properties: [
      {
        key: 'tone',
        value:
          'Friendly and conversational — explain concepts simply, use approachable language, feel like a helpful guide',
      },
    ],
  },
  {
    id: 'tone-analytical',
    name: 'Data Analyst',
    description: 'Neutral, evidence-based, precise',
    category: 'tone',
    properties: [
      {
        key: 'tone',
        value:
          'Analytical and evidence-based — neutral voice, cite data points, let numbers tell the story',
      },
    ],
  },
  {
    id: 'tone-hype',
    name: 'Hype',
    description: 'Energetic, bold, action-oriented',
    category: 'tone',
    properties: [
      {
        key: 'tone',
        value:
          'Energetic and bold — punchy headlines, action-oriented language, build excitement and urgency',
      },
    ],
  },
  {
    id: 'tone-storyteller',
    name: 'Storyteller',
    description: 'Narrative-driven, engaging arc',
    category: 'tone',
    properties: [
      {
        key: 'tone',
        value:
          'Narrative and story-driven — build a compelling arc, use analogies, hook the reader with a question or insight',
      },
    ],
  },

  // Extras
  {
    id: 'extras-bold-type',
    name: 'Bold Typography',
    description: 'Large headings and strong hierarchy',
    category: 'extras',
    properties: [
      {
        key: 'typography',
        value:
          'Bold typographic hierarchy — oversized headings, strong weight contrast between heading and body, generous whitespace',
      },
    ],
  },
  {
    id: 'extras-compact',
    name: 'Compact & Dense',
    description: 'Information-dense, efficient use of space',
    category: 'extras',
    properties: [
      {
        key: 'typography',
        value:
          'Compact and information-dense — smaller type sizes, tighter spacing, maximize content per section',
      },
    ],
  },
  {
    id: 'extras-data-viz',
    name: 'Data Viz Focus',
    description: 'Chart-heavy with direct labels',
    category: 'extras',
    properties: [
      {
        key: 'chart_style',
        value:
          'Clean, high-contrast charts — direct data labels on elements, no legends when possible, minimal gridlines',
      },
      {
        key: 'annotations',
        value:
          'Brief inline callouts highlighting key data shifts and takeaways',
      },
    ],
  },
  {
    id: 'extras-accessible',
    name: 'Accessibility First',
    description: 'High contrast, large text, label-driven',
    category: 'extras',
    properties: [
      {
        key: 'accessibility',
        value:
          'WCAG-friendly — minimum 4.5:1 contrast, no tiny text, use labels and patterns instead of color alone',
      },
      {
        key: 'typography',
        value:
          'Large readable headings, generous line-height, clear sans-serif fonts',
      },
    ],
  },
  {
    id: 'extras-illustrations',
    name: 'Icon & Illustration',
    description: 'Visual metaphors and iconography',
    category: 'extras',
    properties: [
      {
        key: 'illustration',
        value:
          'Use simple icons and illustrations to represent each concept — rounded, friendly shapes, consistent style across all visuals',
      },
    ],
  },
  {
    id: 'extras-cta',
    name: 'Call-to-Action',
    description: 'Conversion-focused with clear CTAs',
    category: 'extras',
    properties: [
      {
        key: 'cta_style',
        value:
          'Prominent call-to-action elements — clear action labels, visual emphasis on next steps, urgency cues where appropriate',
      },
    ],
  },
];
