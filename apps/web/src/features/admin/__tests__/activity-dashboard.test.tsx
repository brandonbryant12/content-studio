import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { ActivityDashboard } from '../components/activity-dashboard';

const mockActivities = [
  {
    id: 'act_0000000000000001',
    userId: 'user-1',
    action: 'created',
    entityType: 'document',
    entityId: 'doc_0000000000000001',
    entityTitle: 'Getting Started Guide',
    metadata: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    userName: 'Alice',
  },
  {
    id: 'act_0000000000000002',
    userId: 'user-2',
    action: 'generated_audio',
    entityType: 'podcast',
    entityId: 'pod_0000000000000001',
    entityTitle: 'Weekly Roundup',
    metadata: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    userName: 'Bob',
  },
  {
    id: 'act_0000000000000003',
    userId: 'user-1',
    action: 'deleted',
    entityType: 'voiceover',
    entityId: 'vo_0000000000000001',
    entityTitle: 'Intro Narration',
    metadata: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    userName: 'Alice',
  },
];

const mockByEntityType = [
  { field: 'document', count: 20 },
  { field: 'podcast', count: 15 },
  { field: 'voiceover', count: 8 },
  { field: 'infographic', count: 3 },
];

const mockTopUsers = [
  { userId: 'user-1', userName: 'Alice', count: 30 },
  { userId: 'user-2', userName: 'Bob', count: 16 },
];

const defaultProps = {
  statsTotal: 46,
  statsByEntityType: mockByEntityType,
  statsLoading: false,
  period: '7d' as const,
  onPeriodChange: vi.fn(),
  entityType: undefined,
  onEntityTypeChange: vi.fn(),
  userId: undefined,
  onUserIdChange: vi.fn(),
  topUsers: mockTopUsers,
  searchQuery: '',
  onSearchChange: vi.fn(),
  activities: mockActivities,
  hasMore: false,
  onLoadMore: vi.fn(),
  isLoadingMore: false,
  feedLoading: false,
};

describe('ActivityDashboard', () => {
  it('renders the page heading', () => {
    render(<ActivityDashboard {...defaultProps} />);

    expect(
      screen.getByRole('heading', { name: 'Activity' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Monitor all user activity across the platform.'),
    ).toBeInTheDocument();
  });

  it('renders activity stats with correct totals', () => {
    render(<ActivityDashboard {...defaultProps} />);

    expect(screen.getByText('Total Activities')).toBeInTheDocument();
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Podcasts')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Voiceovers')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders activity feed items with entity titles and user names', () => {
    render(<ActivityDashboard {...defaultProps} />);

    // Alice appears in two activities
    expect(screen.getAllByText('Alice')).toHaveLength(2);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('Weekly Roundup')).toBeInTheDocument();
    expect(screen.getByText('Intro Narration')).toBeInTheDocument();
  });

  it('renders entity type labels in feed', () => {
    render(<ActivityDashboard {...defaultProps} />);

    expect(screen.getByText(/Document/)).toBeInTheDocument();
    expect(screen.getByText(/Podcast/)).toBeInTheDocument();
    expect(screen.getByText(/Voiceover/)).toBeInTheDocument();
  });

  it('shows empty state when no activities', () => {
    render(<ActivityDashboard {...defaultProps} activities={[]} />);

    expect(screen.getByText('No activity found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Activity will appear here as users create and modify content.',
      ),
    ).toBeInTheDocument();
  });

  it('shows loading state for feed', () => {
    render(<ActivityDashboard {...defaultProps} feedLoading={true} />);

    // Feed items should not be visible
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('shows "Load more" button when hasMore is true', () => {
    render(<ActivityDashboard {...defaultProps} hasMore={true} />);

    const loadMoreButton = screen.getByRole('button', {
      name: 'Load more activities',
    });
    expect(loadMoreButton).toBeInTheDocument();
  });

  it('does not show "Load more" button when hasMore is false', () => {
    render(<ActivityDashboard {...defaultProps} hasMore={false} />);

    expect(
      screen.queryByRole('button', { name: 'Load more activities' }),
    ).not.toBeInTheDocument();
  });

  it('calls onLoadMore when "Load more" is clicked', () => {
    const onLoadMore = vi.fn();
    render(
      <ActivityDashboard
        {...defaultProps}
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Load more activities' }),
    );
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('disables "Load more" button while loading more', () => {
    render(
      <ActivityDashboard
        {...defaultProps}
        hasMore={true}
        isLoadingMore={true}
      />,
    );

    const loadMoreButton = screen.getByRole('button', {
      name: 'Load more activities',
    });
    expect(loadMoreButton).toBeDisabled();
  });

  describe('period selector', () => {
    it('renders period tabs with correct ARIA roles', () => {
      render(<ActivityDashboard {...defaultProps} />);

      const tablist = screen.getByRole('tablist', { name: 'Time period' });
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      expect(tabs[0]).toHaveTextContent('24h');
      expect(tabs[1]).toHaveTextContent('7d');
      expect(tabs[2]).toHaveTextContent('30d');
    });

    it('marks the active period as selected', () => {
      render(<ActivityDashboard {...defaultProps} period="7d" />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('calls onPeriodChange when a tab is clicked', () => {
      const onPeriodChange = vi.fn();
      render(
        <ActivityDashboard {...defaultProps} onPeriodChange={onPeriodChange} />,
      );

      fireEvent.click(screen.getAllByRole('tab')[0]!);
      expect(onPeriodChange).toHaveBeenCalledWith('24h');

      fireEvent.click(screen.getAllByRole('tab')[2]!);
      expect(onPeriodChange).toHaveBeenCalledWith('30d');
    });
  });

  describe('relative timestamps', () => {
    it('shows relative time for recent activities', () => {
      render(<ActivityDashboard {...defaultProps} />);

      // 5 minutes ago should show "5m ago"
      expect(screen.getByText('5m ago')).toBeInTheDocument();
      // 2 hours ago should show "2h ago"
      expect(screen.getByText('2h ago')).toBeInTheDocument();
      // 3 days ago should show "3d ago"
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('renders the search input', () => {
      render(<ActivityDashboard {...defaultProps} />);

      expect(
        screen.getByRole('textbox', { name: 'Search activity' }),
      ).toBeInTheDocument();
    });

    it('calls onSearchChange when typing', () => {
      const onSearchChange = vi.fn();
      render(
        <ActivityDashboard {...defaultProps} onSearchChange={onSearchChange} />,
      );

      fireEvent.change(
        screen.getByRole('textbox', { name: 'Search activity' }),
        { target: { value: 'Alice' } },
      );
      expect(onSearchChange).toHaveBeenCalledWith('Alice');
    });

    it('displays current search value', () => {
      render(<ActivityDashboard {...defaultProps} searchQuery="Weekly" />);

      expect(
        screen.getByRole('textbox', { name: 'Search activity' }),
      ).toHaveValue('Weekly');
    });
  });

  describe('filters', () => {
    it('renders entity type filter', () => {
      render(<ActivityDashboard {...defaultProps} />);

      expect(screen.getByText('Entity Type')).toBeInTheDocument();
    });

    it('renders user filter when topUsers is non-empty', () => {
      render(<ActivityDashboard {...defaultProps} />);

      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('hides user filter when topUsers is empty', () => {
      render(<ActivityDashboard {...defaultProps} topUsers={[]} />);

      expect(screen.queryByText('User')).not.toBeInTheDocument();
    });
  });
});
