import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PodcastItem, type PodcastListItem } from '../components/podcast-item';
import type { UseQuickPlayReturn } from '@/shared/hooks/use-quick-play';

// Mock TanStack Router Link to render a plain anchor
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={props.to}>{children}</a>
  ),
}));

// Mock getStorageUrl so importing podcast-item doesn't trigger env parsing.
// The mock returns the key as-is — this is fine because we only care about
// the URL passed to toggle, which should NOT go through getStorageUrl.
vi.mock('@/shared/lib/storage-url', () => ({
  getStorageUrl: (key: string) => `http://mock-storage/${key}`,
}));

function createMockQuickPlay(
  overrides: Partial<UseQuickPlayReturn> = {},
): UseQuickPlayReturn {
  return {
    playingId: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    toggle: vi.fn(),
    stop: vi.fn(),
    formatTime: (t: number) =>
      `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
    ...overrides,
  };
}

const FULL_AUDIO_URL =
  'http://localhost:3036/storage/podcasts/pod_1/audio-123.wav';

const podcastWithAudio: PodcastListItem = {
  id: 'pod_1',
  title: 'Test Podcast',
  description: 'A test description',
  format: 'conversation',
  audioUrl: FULL_AUDIO_URL,
  createdAt: '2024-01-01T00:00:00Z',
  status: 'ready',
  duration: 120,
  coverImageStorageKey: null,
};

describe('PodcastItem quick play', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes audioUrl directly to toggle without wrapping in getStorageUrl', () => {
    const quickPlay = createMockQuickPlay();

    render(
      <PodcastItem
        podcast={podcastWithAudio}
        onDelete={vi.fn()}
        quickPlay={quickPlay}
      />,
    );

    const playButton = screen.getByRole('button', {
      name: /play test podcast/i,
    });
    fireEvent.click(playButton);

    expect(quickPlay.toggle).toHaveBeenCalledWith('pod_1', FULL_AUDIO_URL);
    // Verify the URL was NOT double-prefixed
    const calledUrl = (quickPlay.toggle as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(calledUrl).not.toMatch(/\/storage\/.*\/storage\//);
  });

  it('does not show play button when audioUrl is null', () => {
    const quickPlay = createMockQuickPlay();
    const podcastNoAudio = { ...podcastWithAudio, audioUrl: null };

    render(
      <PodcastItem
        podcast={podcastNoAudio}
        onDelete={vi.fn()}
        quickPlay={quickPlay}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /play test podcast/i }),
    ).not.toBeInTheDocument();
  });
});
