import { describe, expect, it, vi } from 'vitest';
import type { UsePodcastSettingsReturn } from '../hooks/use-podcast-settings';
import { PodcastSettings } from '../components/workbench/podcast-settings';
import { render, screen } from '@/test-utils';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'https://api.example.com',
    PUBLIC_AUTH_MODE: 'dev-password',
  },
  isPasswordAuthEnabled: true,
}));

vi.mock('../hooks/use-podcast-settings', () => ({
  MIN_DURATION: 1,
  MAX_DURATION: 10,
  VOICES: [
    {
      id: 'Aoede',
      name: 'Aoede',
      gender: 'female',
      description: 'Melodic and engaging',
    },
    {
      id: 'Charon',
      name: 'Charon',
      gender: 'male',
      description: 'Clear and professional',
    },
    {
      id: 'Puck',
      name: 'Puck',
      gender: 'male',
      description: 'Lively and engaging',
    },
  ],
}));

vi.mock('@/features/personas/hooks', () => ({
  usePersonaList: vi.fn(() => ({
    data: [
      {
        id: 'persona-1',
        name: 'Ava Stone',
        role: 'Host',
        voiceId: 'Puck',
        voiceName: 'Puck',
      },
    ],
  })),
}));

vi.mock('@/shared/hooks', () => ({
  useVoicePreviewController: () => ({
    playingVoiceId: null,
    previewUrls: {},
    togglePreview: vi.fn(),
  }),
}));

const settingsStub: UsePodcastSettingsReturn = {
  hostVoice: 'Puck',
  coHostVoice: 'Charon',
  targetDuration: 5,
  instructions: '',
  hostPersonaId: null,
  coHostPersonaId: null,
  hostPersonaVoiceId: 'Puck',
  coHostPersonaVoiceId: null,
  voiceConflict: false,
  setHostVoice: vi.fn(),
  setCoHostVoice: vi.fn(),
  setTargetDuration: vi.fn(),
  setInstructions: vi.fn(),
  setHostPersona: vi.fn(),
  setCoHostPersona: vi.fn(),
  hasChanges: false,
  hasScriptSettingsChanges: false,
  isSaving: false,
  saveSettings: vi.fn(),
  discardChanges: vi.fn(),
};

describe('PodcastSettings', () => {
  it('explains how persona selection affects podcast output', () => {
    render(
      <PodcastSettings
        podcast={
          {
            id: 'podcast-1',
            format: 'monologue',
          } as never
        }
        settings={settingsStub}
        section="voice"
      />,
    );

    expect(
      screen.getByText('Personas shape both script and audio'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/saved persona voices replace manual voice selection/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/persona details shape how the script sounds/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Persona: what is a persona?' }),
    ).toBeInTheDocument();
  });
});
