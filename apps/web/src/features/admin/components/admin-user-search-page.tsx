import {
  ArrowRightIcon,
  AvatarIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { AdminUserSearchItem } from '../types';

interface AdminUserSearchPageProps {
  readonly searchQuery: string;
  readonly onSearchChange: (value: string) => void;
  readonly users: readonly AdminUserSearchItem[];
  readonly isFetching: boolean;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function UserSearchCard({ user }: { user: AdminUserSearchItem }) {
  return (
    <Link
      to="/admin/$userId"
      params={{ userId: user.id }}
      search={{ entityQuery: '', entityType: 'all', entityPage: 1 }}
      className="group rounded-2xl border border-border/60 bg-card/80 p-5 transition-colors hover:border-primary/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Open admin details for ${user.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <AvatarIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">
                {user.name}
              </h2>
              <Badge variant={user.role === 'admin' ? 'purple' : 'default'}>
                {user.role}
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Joined {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
        <ArrowRightIcon
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export function AdminUserSearchPage({
  searchQuery,
  onSearchChange,
  users,
  isFetching,
}: AdminUserSearchPageProps) {
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm">
        <div className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="search-icon" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by name or email"
              className="search-input"
              aria-label="Search users"
            />
          </div>
          {isFetching ? (
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              <Spinner className="h-3.5 w-3.5" />
              Updating
            </div>
          ) : null}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
          <p className="text-base font-medium text-foreground">
            {hasSearch ? 'No users found' : 'No users yet'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasSearch
              ? 'Try a different name or email address.'
              : 'Users will appear here as soon as they sign in.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <UserSearchCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
