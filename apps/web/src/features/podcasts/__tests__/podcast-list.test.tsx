import { VersionStatus } from '@repo/api/contracts';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { PodcastListItem } from '../components/podcast-item';
import { PodcastList } from '../components/podcast-list';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('../components/podcast-item', () => ({
  PodcastItem: ({
    podcast,
    onDelete,
    isDeleting,
  }: {
    podcast: PodcastListItem;
    onDelete: (id: string) => void;
    isDeleting: boolean;
  }) => (
    <div data-testid={`podcast-item-${podcast.id}`}>
      <span>{podcast.title}</span>
      <button
        onClick={() => onDelete(podcast.id)}
        disabled={isDeleting}
        data-testid={`delete-${podcast.id}`}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  ),
}));

const mockPodcasts: PodcastListItem[] = [
  {
    id: 'podcast-1',
    title: 'Tech Talk Episode 1',
    description: 'Discussion about latest tech trends',
    format: 'conversation',
    audioUrl: null,
    createdAt: '2024-01-15T10:00:00Z',
    status: VersionStatus.READY,
    duration: 1800,
    coverImageStorageKey: null,
    approvedBy: null,
  },
  {
    id: 'podcast-2',
    title: 'AI Weekly',
    description: 'Weekly AI news roundup',
    format: 'conversation',
    audioUrl: null,
    createdAt: '2024-01-16T10:00:00Z',
    status: VersionStatus.GENERATING_SCRIPT,
    duration: null,
    coverImageStorageKey: null,
    approvedBy: null,
  },
  {
    id: 'podcast-3',
    title: 'Product Update',
    description: 'Voice over for product announcement',
    format: 'voice_over',
    audioUrl: null,
    createdAt: '2024-01-17T10:00:00Z',
    status: VersionStatus.DRAFTING,
    duration: null,
    coverImageStorageKey: null,
    approvedBy: null,
  },
];

const mockSelection = {
  selectedIds: new Set<string>() as ReadonlySet<string>,
  selectedCount: 0,
  isSelected: () => false,
  toggle: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
  isAllSelected: () => false,
  isIndeterminate: () => false,
};

const mockQuickPlay = {
  playingId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  toggle: vi.fn(),
  stop: vi.fn(),
  formatTime: (t: number) =>
    `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
};

const defaultProps = {
  podcasts: mockPodcasts,
  searchQuery: '',
  isCreating: false,
  deletingId: null,
  onSearch: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
  quickPlay: mockQuickPlay as never,
  selection: mockSelection,
  isBulkDeleting: false,
  onBulkDelete: vi.fn(),
};

const createProps = (overrides: Partial<typeof defaultProps> = {}) => ({
  ...defaultProps,
  ...overrides,
});

const renderPodcastList = (overrides: Partial<typeof defaultProps> = {}) => {
  render(<PodcastList {...createProps(overrides)} />);
  return { user: userEvent.setup() };
};

const SEARCH_PLACEHOLDER = 'Search podcasts\u2026';

describe('PodcastList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading, create action, search input, and podcast rows', () => {
    renderPodcastList();

    expect(
      screen.getByRole('heading', { name: 'Podcasts' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create podcast/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    for (const { title } of mockPodcasts) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('renders empty state with create actions', () => {
    renderPodcastList({ podcasts: [] });

    expect(screen.getByText('No podcasts yet')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first podcast to get started.'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /create podcast/i }),
    ).toHaveLength(2);
  });

  it('filters podcasts case-insensitively', () => {
    renderPodcastList({ searchQuery: 'TECH' });

    expect(screen.getByText('Tech Talk Episode 1')).toBeInTheDocument();
    expect(screen.queryByText('AI Weekly')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Update')).not.toBeInTheDocument();
  });

  it('shows no-results message when search has no matches', () => {
    renderPodcastList({ searchQuery: 'nonexistent' });

    const noResultsMessage = screen.getByText(/no podcasts found matching/i);
    expect(noResultsMessage).toHaveTextContent('nonexistent');
  });

  it('calls onCreate from both header and empty-state actions', async () => {
    const onCreate = vi.fn();
    const { user } = renderPodcastList({ onCreate, podcasts: [] });

    const createButtons = screen.getAllByRole('button', {
      name: /create podcast/i,
    });

    await user.click(createButtons[0]!);
    await user.click(createButtons[createButtons.length - 1]!);

    expect(onCreate).toHaveBeenCalledTimes(2);
  });

  it('disables create actions while creating', () => {
    renderPodcastList({ podcasts: [], isCreating: true });

    const creatingButtons = screen.getAllByRole('button', {
      name: /creating/i,
    });
    expect(creatingButtons).toHaveLength(2);
    expect(
      creatingButtons.every((button) => button.hasAttribute('disabled')),
    ).toBe(true);
  });

  it('calls onDelete when delete action is selected', async () => {
    const onDelete = vi.fn();
    const { user } = renderPodcastList({ onDelete });

    await user.click(screen.getByTestId('delete-podcast-1'));

    expect(onDelete).toHaveBeenCalledWith('podcast-1');
  });

  it('calls onSearch when user types in search input', async () => {
    const onSearch = vi.fn();
    const { user } = renderPodcastList({ onSearch });

    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      'test query',
    );

    expect(onSearch).toHaveBeenCalled();
  });

  it('keeps search input controlled by searchQuery prop', () => {
    renderPodcastList({ searchQuery: 'my search' });
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue(
      'my search',
    );
  });
});
