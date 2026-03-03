import { describe, it, expect, vi } from 'vitest';
import type { ReactNode, ComponentProps } from 'react';
import { ActivityDashboard } from '../components/activity-dashboard';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params: _params,
    ...rest
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    [key: string]: unknown;
  }) => {
    const ariaLabel =
      typeof rest['aria-label'] === 'string' ? rest['aria-label'] : undefined;
    return (
      <a href={to} aria-label={ariaLabel}>
        {children}
      </a>
    );
  },
}));

const now = Date.now();

const mockActivities = [
  {
    id: 'act_0000000000000001',
    userId: 'user-1',
    action: 'created',
    entityType: 'document',
    entityId: 'doc_0000000000000001',
    entityTitle: 'Getting Started Guide',
    metadata: null,
    createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
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
    createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
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
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
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

const createProps = (
  overrides: Partial<ComponentProps<typeof ActivityDashboard>> = {},
) => ({
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
  ...overrides,
});

const renderDashboard = (
  overrides: Partial<ComponentProps<typeof ActivityDashboard>> = {},
) => render(<ActivityDashboard {...createProps(overrides)} />);

describe('ActivityDashboard', () => {
  it('renders heading, overview text, and core stat cards', () => {
    renderDashboard();

    expect(
      screen.getByRole('heading', { name: 'Activity' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Monitor all user activity across the platform.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Total Activities')).toBeInTheDocument();
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Podcasts')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Voiceovers')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders activity rows with titles, actor/entity labels, and relative times', () => {
    renderDashboard();

    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('Weekly Roundup')).toBeInTheDocument();
    expect(screen.getByText('Intro Narration')).toBeInTheDocument();
    expect(screen.getByText(/Alice · Document/)).toBeInTheDocument();
    expect(screen.getByText(/Bob · Podcast/)).toBeInTheDocument();
    expect(screen.getByText(/Alice · Voiceover/)).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('3d ago')).toBeInTheDocument();
  });

  it.each([
    {
      name: 'shows empty state when activities are empty',
      props: { activities: [] as typeof mockActivities },
      expectEmptyState: true,
    },
    {
      name: 'hides feed rows while feed is loading',
      props: { feedLoading: true },
      expectEmptyState: false,
    },
  ])('$name', ({ props, expectEmptyState }) => {
    renderDashboard(props);

    if (expectEmptyState) {
      expect(screen.getByText('No activity found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Activity will appear here as users create and modify content.',
        ),
      ).toBeInTheDocument();
      return;
    }

    expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'shows load-more button when more pages exist',
      hasMore: true,
      isLoadingMore: false,
      shouldShow: true,
      shouldBeDisabled: false,
    },
    {
      name: 'hides load-more button when there are no more pages',
      hasMore: false,
      isLoadingMore: false,
      shouldShow: false,
      shouldBeDisabled: false,
    },
    {
      name: 'disables load-more button while loading more',
      hasMore: true,
      isLoadingMore: true,
      shouldShow: true,
      shouldBeDisabled: true,
    },
  ])('$name', ({ hasMore, isLoadingMore, shouldShow, shouldBeDisabled }) => {
    renderDashboard({ hasMore, isLoadingMore });

    const button = screen.queryByRole('button', {
      name: 'Load more activities',
    });

    if (!shouldShow) {
      expect(button).not.toBeInTheDocument();
      return;
    }

    expect(button).toBeInTheDocument();
    if (shouldBeDisabled) {
      expect(button).toBeDisabled();
    }
  });

  it('calls onLoadMore when clicking load-more', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    renderDashboard({ hasMore: true, onLoadMore });

    await user.click(
      screen.getByRole('button', { name: 'Load more activities' }),
    );

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('renders period tabs and marks active period', () => {
    renderDashboard({ period: '7d' });

    expect(
      screen.getByRole('tablist', { name: 'Time period' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('calls onPeriodChange when period tab is clicked', async () => {
    const user = userEvent.setup();
    const onPeriodChange = vi.fn();
    renderDashboard({ onPeriodChange });

    await user.click(screen.getAllByRole('tab')[0]!);
    await user.click(screen.getAllByRole('tab')[2]!);

    expect(onPeriodChange).toHaveBeenCalledWith('24h');
    expect(onPeriodChange).toHaveBeenCalledWith('30d');
  });

  it.each([
    { name: 'renders search input', searchQuery: '', expected: '' },
    {
      name: 'renders current search value',
      searchQuery: 'Weekly',
      expected: 'Weekly',
    },
  ])('$name', ({ searchQuery, expected }) => {
    renderDashboard({ searchQuery });

    expect(
      screen.getByRole('textbox', { name: 'Search activity' }),
    ).toHaveValue(expected);
  });

  it('calls onSearchChange when typing into search input', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    renderDashboard({ onSearchChange });

    await user.type(
      screen.getByRole('textbox', { name: 'Search activity' }),
      'A',
    );

    expect(onSearchChange).toHaveBeenCalledWith('A');
  });

  it('shows stat loading spinners when stats are loading', () => {
    renderDashboard({ statsLoading: true });

    expect(screen.queryByText('46')).not.toBeInTheDocument();
    expect(screen.queryByText('20')).not.toBeInTheDocument();
  });

  it('renders feed links only for non-deleted activities', () => {
    renderDashboard();

    expect(
      screen.getByRole('link', {
        name: /view document: getting started guide/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('link', { name: /view voiceover: intro narration/i }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'shows user filter when top users exist',
      topUsers: mockTopUsers,
      shouldShowUserFilter: true,
    },
    {
      name: 'hides user filter when top users are empty',
      topUsers: [],
      shouldShowUserFilter: false,
    },
  ])('$name', ({ topUsers, shouldShowUserFilter }) => {
    renderDashboard({ topUsers });

    expect(screen.getByText('Entity Type')).toBeInTheDocument();
    if (shouldShowUserFilter) {
      expect(screen.getByText('User')).toBeInTheDocument();
    } else {
      expect(screen.queryByText('User')).not.toBeInTheDocument();
    }
  });
});
