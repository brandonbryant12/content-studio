import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceoverList } from '../components/voiceover-list';
import type { VoiceoverListItem } from '../components/voiceover-item';
import type { UseQuickPlayReturn } from '@/shared/hooks/use-quick-play';
import type { UseBulkSelectionReturn } from '@/shared/hooks';

// Mock TanStack Router Link to render a plain anchor
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={props.to}>{children}</a>
  ),
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

const mockSelection: UseBulkSelectionReturn = {
  selectedIds: new Set<string>() as ReadonlySet<string>,
  selectedCount: 0,
  isSelected: () => false,
  toggle: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
  isAllSelected: () => false,
  isIndeterminate: () => false,
};

const FULL_AUDIO_URL =
  'http://localhost:3036/storage/voiceovers/vo_1/audio-456.wav';

const voiceovers: readonly VoiceoverListItem[] = [
  {
    id: 'vo_1',
    title: 'Product Announcement',
    text: 'Introducing our newest product...',
    voice: 'Charon',
    voiceName: 'Charon',
    audioUrl: FULL_AUDIO_URL,
    createdAt: '2024-01-01T00:00:00Z',
    status: 'ready',
    duration: 120,
  },
  {
    id: 'vo_2',
    title: 'Draft Voiceover',
    text: 'Some draft text',
    voice: 'Puck',
    voiceName: 'Puck',
    audioUrl: null,
    createdAt: '2024-01-02T00:00:00Z',
    status: 'drafting',
    duration: null,
  },
];

describe('VoiceoverList quick play', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes audioUrl directly to toggle without wrapping in getStorageUrl', () => {
    const quickPlay = createMockQuickPlay();

    render(
      <VoiceoverList
        voiceovers={voiceovers}
        searchQuery=""
        isCreating={false}
        deletingId={null}
        onSearch={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        quickPlay={quickPlay}
        selection={mockSelection}
        isBulkDeleting={false}
        onBulkDelete={vi.fn()}
      />,
    );

    const playButton = screen.getByRole('button', {
      name: /play product announcement/i,
    });
    fireEvent.click(playButton);

    expect(quickPlay.toggle).toHaveBeenCalledWith('vo_1', FULL_AUDIO_URL);
    // Verify the URL was NOT double-prefixed
    const calledUrl = (quickPlay.toggle as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(calledUrl).not.toMatch(/\/storage\/.*\/storage\//);
  });

  it('does not show play button for voiceovers without audio', () => {
    const quickPlay = createMockQuickPlay();

    render(
      <VoiceoverList
        voiceovers={voiceovers}
        searchQuery=""
        isCreating={false}
        deletingId={null}
        onSearch={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        quickPlay={quickPlay}
        selection={mockSelection}
        isBulkDeleting={false}
        onBulkDelete={vi.fn()}
      />,
    );

    // vo_2 has no audio - should not have a play button
    expect(
      screen.queryByRole('button', { name: /play draft voiceover/i }),
    ).not.toBeInTheDocument();
  });
});
