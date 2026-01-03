// features/podcasts/__tests__/podcast-list.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { PodcastList } from '../components/podcast-list';
import type { PodcastListItem } from '../components/podcast-item';

// Mock PodcastItem to avoid router dependency
vi.mock('../components/podcast-item', () => ({
  PodcastItem: ({
    podcast,
    onDelete,
    isDeleting,
  }: {
    podcast: PodcastListItem;
    onDelete: () => void;
    isDeleting: boolean;
  }) => (
    <div data-testid={`podcast-item-${podcast.id}`}>
      <span>{podcast.title}</span>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        data-testid={`delete-${podcast.id}`}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  ),
}));

// Mock podcast data matching PodcastListItem interface
const mockPodcasts: PodcastListItem[] = [
  {
    id: 'podcast-1',
    title: 'Tech Talk Episode 1',
    description: 'Discussion about latest tech trends',
    format: 'conversation',
    createdAt: '2024-01-15T10:00:00Z',
    activeVersion: { status: 'ready', duration: 1800 },
  },
  {
    id: 'podcast-2',
    title: 'AI Weekly',
    description: 'Weekly AI news roundup',
    format: 'conversation',
    createdAt: '2024-01-16T10:00:00Z',
    activeVersion: { status: 'generating_script', duration: null },
  },
  {
    id: 'podcast-3',
    title: 'Product Update',
    description: 'Voice over for product announcement',
    format: 'voice_over',
    createdAt: '2024-01-17T10:00:00Z',
    activeVersion: { status: 'drafting', duration: null },
  },
];

// Default props for PodcastList
const createDefaultProps = () => ({
  podcasts: mockPodcasts,
  searchQuery: '',
  isCreating: false,
  deletingId: null,
  onSearch: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
});

describe('PodcastList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of podcasts', () => {
    render(<PodcastList {...createDefaultProps()} />);

    // Check header
    expect(screen.getByText('Podcasts')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create new/i }),
    ).toBeInTheDocument();

    // Check all podcast titles are rendered
    expect(screen.getByText('Tech Talk Episode 1')).toBeInTheDocument();
    expect(screen.getByText('AI Weekly')).toBeInTheDocument();
    expect(screen.getByText('Product Update')).toBeInTheDocument();
  });

  it('shows empty state when no podcasts', () => {
    render(<PodcastList {...createDefaultProps()} podcasts={[]} />);

    expect(screen.getByText('No podcasts yet')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first podcast to get started.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create podcast/i }),
    ).toBeInTheDocument();
  });

  it('filters podcasts by search query', () => {
    render(<PodcastList {...createDefaultProps()} searchQuery="tech" />);

    // Only "Tech Talk Episode 1" should be visible
    expect(screen.getByText('Tech Talk Episode 1')).toBeInTheDocument();
    expect(screen.queryByText('AI Weekly')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Update')).not.toBeInTheDocument();
  });

  it('shows no results message when search matches nothing', () => {
    render(<PodcastList {...createDefaultProps()} searchQuery="nonexistent" />);

    expect(
      screen.getByText('No podcasts found matching "nonexistent"'),
    ).toBeInTheDocument();

    // Original podcasts should not be visible
    expect(screen.queryByText('Tech Talk Episode 1')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Weekly')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Update')).not.toBeInTheDocument();
  });

  it('calls onCreate when create button clicked', () => {
    const onCreate = vi.fn();
    render(<PodcastList {...createDefaultProps()} onCreate={onCreate} />);

    const createButton = screen.getByRole('button', { name: /create new/i });
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows creating state when isCreating=true', () => {
    render(<PodcastList {...createDefaultProps()} isCreating={true} />);

    // Should show "Creating..." text in header button
    const createButton = screen.getByRole('button', { name: /creating/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeDisabled();
  });

  it('calls onDelete when podcast delete is triggered', () => {
    const onDelete = vi.fn();
    render(<PodcastList {...createDefaultProps()} onDelete={onDelete} />);

    // Click the delete button for the first podcast
    const deleteButton = screen.getByTestId('delete-podcast-1');
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('podcast-1');
  });

  it('calls onSearch when search input changes', () => {
    const onSearch = vi.fn();
    render(<PodcastList {...createDefaultProps()} onSearch={onSearch} />);

    const searchInput = screen.getByPlaceholderText('Search podcasts...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('shows creating state in empty state when isCreating=true and no podcasts', () => {
    render(
      <PodcastList {...createDefaultProps()} podcasts={[]} isCreating={true} />,
    );

    // Both header and empty state buttons should show Creating... and be disabled
    const createButtons = screen.getAllByRole('button', { name: /creating/i });
    expect(createButtons).toHaveLength(2);
    createButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('filters case-insensitively', () => {
    render(<PodcastList {...createDefaultProps()} searchQuery="TECH" />);

    // Should find "Tech Talk Episode 1" with uppercase query
    expect(screen.getByText('Tech Talk Episode 1')).toBeInTheDocument();
    expect(screen.queryByText('AI Weekly')).not.toBeInTheDocument();
  });

  it('shows search input with current query value', () => {
    render(<PodcastList {...createDefaultProps()} searchQuery="my search" />);

    const searchInput = screen.getByPlaceholderText('Search podcasts...');
    expect(searchInput).toHaveValue('my search');
  });

  it('calls onCreate from empty state button', () => {
    const onCreate = vi.fn();
    render(
      <PodcastList
        {...createDefaultProps()}
        podcasts={[]}
        onCreate={onCreate}
      />,
    );

    const createButton = screen.getByRole('button', {
      name: /create podcast/i,
    });
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
