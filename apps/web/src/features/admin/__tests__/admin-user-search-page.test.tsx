import { describe, expect, it, vi } from 'vitest';
import type { ReactNode, ComponentProps } from 'react';
import { AdminUserSearchPage } from '../components/admin-user-search-page';
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
    const href = params?.userId ? to.replace('$userId', params.userId) : to;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const createProps = (
  overrides: Partial<ComponentProps<typeof AdminUserSearchPage>> = {},
) => ({
  searchQuery: '',
  onSearchChange: vi.fn(),
  isFetching: false,
  users: [
    {
      id: 'user-1',
      name: 'Alice Example',
      email: 'alice@example.com',
      emailVerified: true,
      image: null,
      role: 'user',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'admin-2',
      name: 'Admin User',
      email: 'admin@example.com',
      emailVerified: true,
      image: null,
      role: 'admin',
      createdAt: '2026-03-02T10:00:00.000Z',
      updatedAt: '2026-03-02T10:00:00.000Z',
    },
  ],
  ...overrides,
});

const renderPage = (
  overrides: Partial<ComponentProps<typeof AdminUserSearchPage>> = {},
) => render(<AdminUserSearchPage {...createProps(overrides)} />);

describe('AdminUserSearchPage', () => {
  it('renders search input and user result cards', () => {
    renderPage();

    expect(screen.getByRole('textbox', { name: 'Search users' })).toHaveValue(
      '',
    );
    expect(screen.getByText('Alice Example')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Open admin details for Alice Example',
      }),
    ).toHaveAttribute('href', '/admin/user-1');
  });

  it('calls onSearchChange when typing', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    renderPage({ onSearchChange });

    await user.type(
      screen.getByRole('textbox', { name: 'Search users' }),
      'Ali',
    );

    expect(onSearchChange).toHaveBeenCalled();
    expect(onSearchChange).toHaveBeenCalledWith('A');
    expect(onSearchChange).toHaveBeenCalledWith('l');
    expect(onSearchChange).toHaveBeenCalledWith('i');
  });

  it('shows empty state when no users match', () => {
    renderPage({ users: [], searchQuery: 'nobody' });

    expect(screen.getByText('No users found')).toBeInTheDocument();
    expect(
      screen.getByText('Try a different name or email address.'),
    ).toBeInTheDocument();
  });
});
