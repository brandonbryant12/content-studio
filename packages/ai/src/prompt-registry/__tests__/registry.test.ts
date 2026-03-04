import { describe, expect, it } from 'vitest';
import { PROMPT_REGISTRY } from '../registry';

const SAMPLE_INPUTS: Record<string, unknown> = {
  'chat.research.system': undefined,
  'chat.persona.system': undefined,
  'chat.writing-assistant.system': {
    transcript:
      'Welcome back to the show. Today we break down practical AI workflows.',
  },
  'chat.synthesize-persona.system': undefined,
  'chat.synthesize-research-query.system': undefined,
  'voiceover.preprocess.system': undefined,
  'voiceover.preprocess.user': {
    text: 'Welcome to the show. Today we cover practical AI workflows.',
    needsTitle: true,
  },
  'podcast.script.system': {
    format: 'conversation',
    customInstructions: 'Keep tone concise and practical.',
    hostPersona: {
      name: 'Alex Stone',
      role: 'Host',
      speakingStyle: 'Direct and curious',
      exampleQuotes: ['Lets break this down clearly.'],
    },
    coHostPersona: {
      name: 'Riley Fox',
      role: 'Co-Host',
      speakingStyle: 'Energetic and skeptical',
    },
    targetSegment: {
      name: 'Product leaders',
      description: 'Heads of product and engineering managers',
    },
  },
  'podcast.script.user': {
    title: 'AI Team Playbook',
    description: 'Operational guidance for shipping AI features safely',
    sourceContent:
      'Use clear ownership, safety checks, and measurable outcomes.',
  },
  'infographic.generate.user': {
    styleProperties: [
      { key: 'Palette', value: 'Neon contrast', type: 'text' },
      { key: 'Accent', value: '#ff00ff', type: 'color' },
    ],
    format: 'portrait',
    prompt: 'Create a summary infographic about quarterly growth.',
  },
  'infographic.title.user': {
    sourcePrompt:
      'Create an infographic about quarter-over-quarter SaaS growth',
  },
  'infographic.layout.user': {
    prompt: 'Show how teams improve release velocity after CI hardening.',
    format: 'landscape',
    styleProperties: [
      { key: 'Tone', value: 'technical and clean', type: 'text' },
      { key: 'Primary', value: '#0ea5e9', type: 'color' },
    ],
  },
  'source.outline.user': {
    query: 'How should engineering teams adopt schema-first AI workflows?',
    sourceHints: ['https://example.com/reference'],
    content:
      'Schema-first workflows reduce parsing errors and improve review speed.',
  },
  'podcast.cover-image.user': {
    title: 'Future of AI Workflows',
    description: 'A practical engineering discussion',
    summary: 'How teams can ship AI safely and quickly.',
  },
  'persona.avatar-image.user': {
    name: 'Jordan Vale',
    role: 'Technology Analyst',
    personalityDescription: 'Practical, curious, and energetic',
  },
};

describe('prompt registry', () => {
  it('has unique prompt ids', () => {
    const ids = PROMPT_REGISTRY.map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('enforces baseline metadata for compliance and ownership', () => {
    for (const prompt of PROMPT_REGISTRY) {
      expect(prompt.id).toMatch(/^[a-z0-9.-]+$/);
      expect(prompt.version).toBeGreaterThan(0);
      expect(prompt.owner.trim().length).toBeGreaterThan(0);
      expect(prompt.summary.trim().length).toBeGreaterThan(0);
      expect(prompt.compliance.notes.trim().length).toBeGreaterThan(0);
      expect(prompt.compliance.prohibitedData.length).toBeGreaterThan(0);
    }
  });

  it('renders non-empty text for each registered prompt', () => {
    for (const prompt of PROMPT_REGISTRY) {
      const input = SAMPLE_INPUTS[prompt.id];
      const rendered = prompt.render(input as never);
      expect(rendered.trim().length).toBeGreaterThan(0);
    }
  });
});
