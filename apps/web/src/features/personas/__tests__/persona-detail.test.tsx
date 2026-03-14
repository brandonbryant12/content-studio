import { describe, expect, it, vi } from 'vitest';
import type { RouterOutput } from '@repo/api/client';
import type { ComponentProps, PropsWithChildren } from 'react';
import { PersonaDetail } from '../components/persona-detail';
import { render, screen, userEvent } from '@/test-utils';

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
  it('shows save/discard controls only when there are pending changes', () => {
    const { rerender } = render(<PersonaDetail {...defaultProps} />);

    expect(
      screen.queryAllByRole('button', { name: /save changes/i }),
    ).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /discard/i })).toHaveLength(
      0,
    );

    rerender(<PersonaDetail {...defaultProps} hasChanges={true} />);

    expect(screen.getAllByRole('button', { name: /save changes/i })).toHaveLength(
      2,
    );
    expect(screen.getAllByRole('button', { name: /discard/i })).toHaveLength(2);
  });

  it('disables save when trimmed name is empty', () => {
    render(
      <PersonaDetail
        {...defaultProps}
        hasChanges={true}
        formValues={{
          ...defaultProps.formValues,
          name: '   ',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('opens delete confirmation and calls onDelete after confirmation', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<PersonaDetail {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete persona/i }));

    expect(screen.getByRole('heading', { name: /delete persona/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('heading', { name: /delete persona/i }),
    ).not.toBeInTheDocument();
  });
});
