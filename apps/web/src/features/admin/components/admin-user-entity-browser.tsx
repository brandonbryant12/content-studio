import {
  ArrowRightIcon,
  AvatarIcon,
  FileTextIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Badge, type BadgeVariant } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  ADMIN_USER_ENTITY_TYPES,
  DEFAULT_ADMIN_USER_ENTITY_LIMIT,
  type AdminUserEntitiesResult,
  type AdminUserEntity,
  type AdminUserEntityType,
  type AdminUserEntityTypeFilter,
} from '../types';

interface AdminUserEntityBrowserProps {
  readonly targetUserId: string;
  readonly entityList: AdminUserEntitiesResult;
  readonly searchQuery: string;
  readonly onSearchChange: (value: string) => void;
  readonly entityType: AdminUserEntityTypeFilter;
  readonly onEntityTypeChange: (value: AdminUserEntityTypeFilter) => void;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly isFetching: boolean;
}

const ENTITY_META: Record<
  AdminUserEntityType,
  {
    label: string;
    filterLabel: string;
    icon: ComponentType<{ className?: string }>;
    accent: string;
  }
> = {
  source: {
    label: 'Source',
    filterLabel: 'Sources',
    icon: FileTextIcon,
    accent:
      'bg-sky-500/10 text-sky-700 border-sky-200/60 dark:text-sky-300 dark:border-sky-900/60',
  },
  podcast: {
    label: 'Podcast',
    filterLabel: 'Podcasts',
    icon: MixerHorizontalIcon,
    accent:
      'bg-violet-500/10 text-violet-700 border-violet-200/60 dark:text-violet-300 dark:border-violet-900/60',
  },
  voiceover: {
    label: 'Voiceover',
    filterLabel: 'Voiceovers',
    icon: SpeakerLoudIcon,
    accent:
      'bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  persona: {
    label: 'Persona',
    filterLabel: 'Personas',
    icon: AvatarIcon,
    accent:
      'bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-300 dark:border-rose-900/60',
  },
  infographic: {
    label: 'Infographic',
    filterLabel: 'Infographics',
    icon: ImageIcon,
    accent:
      'bg-amber-500/10 text-amber-700 border-amber-200/60 dark:text-amber-300 dark:border-amber-900/60',
  },
};

const FILTER_OPTIONS: ReadonlyArray<{
  value: AdminUserEntityTypeFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  ...ADMIN_USER_ENTITY_TYPES.map((entityType) => ({
    value: entityType,
    label: ENTITY_META[entityType].filterLabel,
  })),
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatStatus = (value: string) =>
  value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const getStatusVariant = (status: string | null): BadgeVariant => {
  if (status === null) {
    return 'default';
  }

  if (status === 'ready' || status === 'succeeded') {
    return 'success';
  }

  if (status === 'failed') {
    return 'error';
  }

  if (
    status === 'processing' ||
    status === 'generating' ||
    status === 'generating_script' ||
    status === 'generating_audio'
  ) {
    return 'warning';
  }

  return 'default';
};

function EntityResultLink({
  entity,
  targetUserId,
  className,
  children,
}: {
  entity: AdminUserEntity;
  targetUserId: string;
  className: string;
  children: ReactNode;
}) {
  switch (entity.entityType) {
    case 'source':
      return (
        <Link
          to="/sources/$sourceId"
          params={{ sourceId: entity.entityId }}
          search={{ userId: targetUserId }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'podcast':
      return (
        <Link
          to="/podcasts/$podcastId"
          params={{ podcastId: entity.entityId }}
          search={{ userId: targetUserId }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'voiceover':
      return (
        <Link
          to="/voiceovers/$voiceoverId"
          params={{ voiceoverId: entity.entityId }}
          search={{ userId: targetUserId }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'persona':
      return (
        <Link
          to="/personas/$personaId"
          params={{ personaId: entity.entityId }}
          search={{ userId: targetUserId }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'infographic':
      return (
        <Link
          to="/infographics/$infographicId"
          params={{ infographicId: entity.entityId }}
          search={{ userId: targetUserId }}
          className={className}
        >
          {children}
        </Link>
      );
  }
}

function EntityResultRow({
  entity,
  targetUserId,
}: {
  entity: AdminUserEntity;
  targetUserId: string;
}) {
  const meta = ENTITY_META[entity.entityType];
  const Icon = meta.icon;

  return (
    <EntityResultLink
      entity={entity}
      targetUserId={targetUserId}
      className="group block rounded-2xl border border-border/50 bg-background/80 p-4 transition-colors hover:border-primary/30 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-2xl border px-3 py-2 ${meta.accent}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{meta.label}</Badge>
            {entity.status ? (
              <Badge variant={getStatusVariant(entity.status)}>
                {formatStatus(entity.status)}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-3 truncate text-base font-semibold text-foreground">
            {entity.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {entity.subtitle ?? ''}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Updated {formatDate(entity.updatedAt)} / Created{' '}
            {formatDate(entity.createdAt)}
          </p>
        </div>
        <ArrowRightIcon
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </EntityResultLink>
  );
}

export function AdminUserEntityBrowser({
  targetUserId,
  entityList,
  searchQuery,
  onSearchChange,
  entityType,
  onEntityTypeChange,
  page,
  onPageChange,
  isFetching,
}: AdminUserEntityBrowserProps) {
  const hasFilters = searchQuery.trim().length > 0 || entityType !== 'all';
  const pageCount = Math.max(
    1,
    Math.ceil(entityList.total / DEFAULT_ADMIN_USER_ENTITY_LIMIT),
  );
  const pageStart =
    entityList.total === 0
      ? 0
      : (page - 1) * DEFAULT_ADMIN_USER_ENTITY_LIMIT + 1;
  const pageEnd =
    entityList.total === 0
      ? 0
      : Math.min(page * DEFAULT_ADMIN_USER_ENTITY_LIMIT, entityList.total);

  return (
    <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Content</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            All Content
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Search and browse content across all types.
          </p>
        </div>
        {isFetching ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            <Spinner className="h-3.5 w-3.5" />
            Refreshing results
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-border/60 bg-muted/20 p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="search-icon" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by title or name"
            className="search-input pl-10"
            aria-label="Search content"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by type">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={entityType === option.value ? 'default' : 'outline'}
              onClick={() => onEntityTypeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {entityList.entities.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
          <p className="text-base font-medium text-foreground">
            {hasFilters ? 'No content found' : 'No content yet'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasFilters
              ? 'Try a different search term or change the type filter.'
              : 'Content will appear here once this user starts creating.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {entityList.entities.map((entity) => (
            <EntityResultRow
              key={`${entity.entityType}-${entity.entityId}`}
              entity={entity}
              targetUserId={targetUserId}
            />
          ))}

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {pageStart} - {pageEnd} of {entityList.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <p className="min-w-[88px] text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Page {page} of {pageCount}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPageChange(page + 1)}
                disabled={!entityList.hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
