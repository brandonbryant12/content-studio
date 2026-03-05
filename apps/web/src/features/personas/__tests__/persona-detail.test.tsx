import { describe, expect, it, vi } from 'vitest';
import type { RouterOutput } from '@repo/api/client';
import type { ComponentProps, PropsWithChildren } from 'react';
import { PersonaDetail } from '../components/persona-detail';
import { render, screen } from '@/test-utils';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'https://api.example.com',
    PUBLIC_AUTH_MODE: 'dev-password',
  },
  isPasswordAuthEnabled: true,
}));

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

type PersonaDetailProps = ComponentProps<typeof PersonaDetail>;
type Persona = RouterOutput['personas']['get'];

const defaultProps: PersonaDetailProps = {
  persona: {
    id: 'persona-1' as Persona['id'],
    name: 'Ava Stone',
    role: 'Client Podcast Host',
    personalityDescription: 'Practical and confident.',
    speakingStyle: 'Crisp and direct.',
    exampleQuotes: ['Let us make this useful.'],
    voiceId: null,
    voiceName: null,
    avatarStorageKey: null,
    createdBy: 'user-1',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  },
  formValues: {
    name: 'Ava Stone',
    role: 'Client Podcast Host',
    personalityDescription: 'Practical and confident.',
    speakingStyle: 'Crisp and direct.',
    exampleQuotes: ['Let us make this useful.'],
    voiceId: '',
    voiceName: '',
  },
  hasChanges: false,
  isSaving: false,
  isDeleting: false,
  isGeneratingAvatar: false,
  onFormChange: vi.fn(),
  onSave: vi.fn(),
  onDiscard: vi.fn(),
  onDelete: vi.fn(),
  onGenerateAvatar: vi.fn(),
};

describe('PersonaDetail', () => {
  it('shows workflow guidance and field-level education', () => {
    render(<PersonaDetail {...defaultProps} />);

    expect(screen.getByText('How this persona is used')).toBeInTheDocument();
    expect(screen.getByText(/shape how this host speaks/i)).toBeInTheDocument();
    expect(
      screen.getByText(/speaker name shown in podcast scripts/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /default voice to use whenever this persona is selected/i,
      ),
    ).toBeInTheDocument();
  });
});
