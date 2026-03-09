import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { AdminUserEntityBrowser } from '../components/admin-user-entity-browser';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    [key: string]: unknown;
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [key, value]) => path.replace(`$${key}`, value),
      to,
    );

    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const createProps = (
  overrides: Partial<ComponentProps<typeof AdminUserEntityBrowser>> = {},
): ComponentProps<typeof AdminUserEntityBrowser> => ({
  entityList: {
    entities: [
      {
        entityType: 'podcast',
        entityId: 'pod_1',
        title: 'Alpha Podcast',
        subtitle: 'conversation',
        status: 'ready',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-05T10:00:00.000Z',
      },
      {
        entityType: 'source',
        entityId: 'src_1',
        title: 'Alpha Source',
        subtitle: 'manual',
        status: 'processing',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-04T10:00:00.000Z',
      },
    ],
    total: 14,
    hasMore: true,
  },
  searchQuery: '',
  onSearchChange: vi.fn(),
  entityType: 'all',
  onEntityTypeChange: vi.fn(),
  page: 1,
  onPageChange: vi.fn(),
  isFetching: false,
  ...overrides,
});

const renderBrowser = (
  overrides: Partial<ComponentProps<typeof AdminUserEntityBrowser>> = {},
) => render(<AdminUserEntityBrowser {...createProps(overrides)} />);

describe('AdminUserEntityBrowser', () => {
  it('renders entity results, routes, and pagination metadata', () => {
    renderBrowser();

    expect(
      screen.getByRole('heading', { name: 'All Content' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Alpha Podcast')).toBeInTheDocument();
    expect(screen.getByText('Alpha Source')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Alpha Podcast/i }),
    ).toHaveAttribute('href', '/podcasts/pod_1');
    expect(screen.getByText('Showing 1 - 12 of 14')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('calls callbacks when search, filter, and paging controls are used', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onEntityTypeChange = vi.fn();
    const onPageChange = vi.fn();

    renderBrowser({
      onSearchChange,
      onEntityTypeChange,
      onPageChange,
    });

    await user.type(
      screen.getByRole('textbox', { name: 'Search content' }),
      'Alpha',
    );
    await user.click(screen.getByRole('button', { name: 'Podcasts' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onSearchChange).toHaveBeenCalledWith('A');
    expect(onEntityTypeChange).toHaveBeenCalledWith('podcast');
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows the filtered empty state when no entities match', () => {
    renderBrowser({
      entityList: {
        entities: [],
        total: 0,
        hasMore: false,
      },
      searchQuery: 'missing',
      entityType: 'source',
    });

    expect(screen.getByText('No content found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Try a different search term or change the type filter.',
      ),
    ).toBeInTheDocument();
  });
});
