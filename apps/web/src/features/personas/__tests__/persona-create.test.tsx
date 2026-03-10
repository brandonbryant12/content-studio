import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, PropsWithChildren } from 'react';
import { PersonaCreate } from '../components/persona-create';
import { render, screen } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: PropsWithChildren) => <a>{children}</a>,
}));

vi.mock('@/shared/hooks', () => ({
  useVoicePreviewController: () => ({
    playingVoiceId: null,
    previewUrls: {},
    togglePreview: vi.fn(),
  }),
}));

type PersonaCreateProps = ComponentProps<typeof PersonaCreate>;

const defaultProps: PersonaCreateProps = {
  formValues: {
    name: 'Ava Stone',
    role: 'Client Podcast Host',
    personalityDescription: 'Practical and confident.',
    speakingStyle: 'Crisp and direct.',
    exampleQuotes: ['Let us make this useful.'],
    voiceId: '',
    voiceName: '',
  },
  hasChanges: true,
  isSaving: false,
  isGeneratingWithAi: false,
  onFormChange: vi.fn(),
  onSave: vi.fn(),
  onDiscard: vi.fn(),
  onGenerateWithAi: vi.fn(),
};

describe('PersonaCreate', () => {
  it('uses save-oriented actions while editing a draft', () => {
    render(<PersonaCreate {...defaultProps} />);

    expect(
      screen.getAllByRole('button', { name: 'Save Persona' }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Create Persona' }),
    ).not.toBeInTheDocument();
  });
});
