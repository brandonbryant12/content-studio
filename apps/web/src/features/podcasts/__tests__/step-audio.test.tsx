import { describe, expect, it, vi } from 'vitest';
import { StepAudio } from '../components/setup/steps/step-audio';
import { render, screen } from '@/test-utils';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

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
      id: 'Puck',
      name: 'Puck',
      gender: 'male',
      description: 'Lively and engaging',
    },
    {
      id: 'Charon',
      name: 'Charon',
      gender: 'male',
      description: 'Clear and professional',
    },
  ],
}));

vi.mock('@/shared/hooks', () => ({
  useVoicePreviewController: () => ({
    playingVoiceId: null,
    previewUrls: {},
    togglePreview: vi.fn(),
  }),
}));

describe('StepAudio', () => {
  it('shows persona help in the podcast wizard', () => {
    render(
      <StepAudio
        format="monologue"
        duration={5}
        recommendedDuration={4}
        selectedSourceCount={2}
        selectedSourceWordCount={1800}
        pendingSourceCount={0}
        hostVoice="Puck"
        coHostVoice="Charon"
        hostPersonaId={null}
        coHostPersonaId={null}
        onDurationChange={vi.fn()}
        onHostVoiceChange={vi.fn()}
        onCoHostVoiceChange={vi.fn()}
        onHostPersonaChange={vi.fn()}
        onCoHostPersonaChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Persona: what is a persona?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Recommended runtime: 4 min')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Use 4 min' }),
    ).toBeInTheDocument();
  });
});
