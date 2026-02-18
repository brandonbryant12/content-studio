import type { StyleProperty } from '../hooks/use-infographic-settings';

export interface StaticInfographicPreset {
  id: string;
  name: string;
  description: string;
  properties: StyleProperty[];
}

export const STATIC_INFOGRAPHIC_PRESETS: readonly StaticInfographicPreset[] = [
  {
    id: 'example-executive-brief',
    name: 'Executive Brief',
    description: 'Clean, professional, board-ready visuals',
    properties: [
      { key: 'tone', value: 'Confident and concise executive summary' },
      { key: 'palette', value: 'Navy, slate, and one restrained accent color' },
      { key: 'typography', value: 'Strong hierarchy with minimal decoration' },
      { key: 'layout', value: 'Top-line metrics first, details second' },
    ],
  },
  {
    id: 'example-launch-campaign',
    name: 'Launch Campaign Bold',
    description: 'High-energy launch narrative and conversion focus',
    properties: [
      { key: 'tone', value: 'Energetic, persuasive, and action-oriented' },
      { key: 'palette', value: 'Vibrant contrast with one dominant brand hue' },
      { key: 'cta_style', value: 'Clear action labels and urgency cues' },
      { key: 'layout', value: 'Hero statement, proof points, then CTA' },
    ],
  },
  {
    id: 'example-data-journalism',
    name: 'Data Journalism',
    description: 'Story-first layout with evidence and context',
    properties: [
      { key: 'tone', value: 'Analytical, neutral, and evidence-based' },
      { key: 'chart_style', value: 'High-contrast charts with direct labels' },
      { key: 'annotations', value: 'Brief callouts explaining key shifts' },
      { key: 'layout', value: 'Timeline or cause-and-effect progression' },
    ],
  },
  {
    id: 'example-playful-explainer',
    name: 'Playful Explainer',
    description: 'Friendly product education and onboarding',
    properties: [
      { key: 'tone', value: 'Friendly, clear, and lightly conversational' },
      { key: 'palette', value: 'Bright but balanced colors' },
      { key: 'illustration', value: 'Simple iconography and rounded shapes' },
      { key: 'layout', value: 'Step-by-step flow with short captions' },
    ],
  },
  {
    id: 'example-dark-neon',
    name: 'Dark Neon Dashboard',
    description: 'Futuristic metrics wall with dramatic contrast',
    properties: [
      { key: 'tone', value: 'Technical and high-impact' },
      { key: 'background', value: '#0B1020', type: 'color' },
      { key: 'accent_color', value: '#00E5FF', type: 'color' },
      { key: 'secondary_accent', value: '#FF4FD8', type: 'color' },
      { key: 'layout', value: 'Dense dashboard modules with clear grouping' },
    ],
  },
  {
    id: 'example-accessible-education',
    name: 'Accessible Education',
    description: 'Readability-first format for learning content',
    properties: [
      { key: 'tone', value: 'Supportive, direct, and plain language' },
      {
        key: 'accessibility',
        value: 'High contrast, avoid tiny text, rely on labels not color only',
      },
      { key: 'layout', value: 'Single learning objective per section' },
      { key: 'typography', value: 'Large headings and generous spacing' },
    ],
  },
];
