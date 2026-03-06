import {
  ArrowLeftIcon,
  AvatarIcon,
  FileTextIcon,
  ImageIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs';
import { Link } from '@tanstack/react-router';
import type {
  AIUsagePeriod,
  AdminUserDetail,
  AdminUserEntitiesResult,
  AdminUserEntityTypeFilter,
} from '../types';
import type { ComponentType, ReactNode } from 'react';
import { AdminUserEntityBrowser } from './admin-user-entity-browser';

interface AdminUserDetailPageProps {
  readonly detail: AdminUserDetail;
  readonly usagePeriod: AIUsagePeriod;
  readonly onUsagePeriodChange: (value: AIUsagePeriod) => void;
  readonly entityList: AdminUserEntitiesResult;
  readonly entityQuery: string;
  readonly onEntityQueryChange: (value: string) => void;
  readonly entityType: AdminUserEntityTypeFilter;
  readonly onEntityTypeChange: (value: AdminUserEntityTypeFilter) => void;
  readonly entityPage: number;
  readonly onEntityPageChange: (page: number) => void;
  readonly isEntityFetching: boolean;
}

const ENTITY_META = {
  sources: {
    label: 'Sources',
    icon: FileTextIcon,
    accent:
      'bg-sky-500/10 text-sky-700 border-sky-200/60 dark:text-sky-300 dark:border-sky-900/60',
  },
  podcasts: {
    label: 'Podcasts',
    icon: MixerHorizontalIcon,
    accent:
      'bg-violet-500/10 text-violet-700 border-violet-200/60 dark:text-violet-300 dark:border-violet-900/60',
  },
  voiceovers: {
    label: 'Voiceovers',
    icon: SpeakerLoudIcon,
    accent:
      'bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  personas: {
    label: 'Personas',
    icon: AvatarIcon,
    accent:
      'bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-300 dark:border-rose-900/60',
  },
  infographics: {
    label: 'Infographics',
    icon: ImageIcon,
    accent:
      'bg-amber-500/10 text-amber-700 border-amber-200/60 dark:text-amber-300 dark:border-amber-900/60',
  },
} as const;

const USAGE_PERIODS: readonly AIUsagePeriod[] = ['7d', '30d', '90d', 'all'];
type DetailSectionTab =
  | keyof typeof ENTITY_META
  | 'entity-explorer'
  | 'ai-usage';

interface DetailSectionDefinition {
  readonly value: DetailSectionTab;
  readonly label: string;
  readonly description: string;
  readonly count: number;
}

type EntityCounts = AdminUserDetail['entityCounts'];
type RecentEntities = AdminUserDetail['recentEntities'];
type AIUsageSummary = AdminUserDetail['aiUsageSummary'];
type AIUsageEvent = AdminUserDetail['aiUsageEvents'][number];

interface RecentEntityRecord {
  readonly id: PropertyKey;
  readonly updatedAt: string;
}

interface UsageBreakdownRow {
  readonly count: number;
  readonly estimatedCostUsdMicros: number;
  readonly pricedEventCount: number;
}

const STATUS_VARIANT = {
  succeeded: 'success',
  failed: 'error',
  aborted: 'warning',
} as const;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatCurrency = (micros: number) => {
  const usd = micros / 1_000_000;
  const isTinyAmount = usd > 0 && usd < 0.01;

  return usd.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: isTinyAmount ? 4 : 2,
    maximumFractionDigits: isTinyAmount ? 6 : 4,
  });
};

const formatEstimatedCost = ({
  estimatedCostUsdMicros,
  eventCount,
  pricedEventCount,
}: {
  estimatedCostUsdMicros: number;
  eventCount: number;
  pricedEventCount: number;
}) => {
  if (eventCount > 0 && pricedEventCount === 0) {
    return 'Pricing pending';
  }

  return formatCurrency(estimatedCostUsdMicros);
};

const summarizeUsage = (usage: Record<string, unknown>) => {
  const entries = Object.entries(usage).slice(0, 3);
  if (entries.length === 0) {
    return 'No measured units';
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
};

const getTotalEntityCount = (entityCounts: EntityCounts) =>
  entityCounts.sources +
  entityCounts.podcasts +
  entityCounts.voiceovers +
  entityCounts.personas +
  entityCounts.infographics;

const getEstimatedCostDescription = (aiUsageSummary: AIUsageSummary) =>
  aiUsageSummary.totalEvents === 0
    ? 'No AI usage in this period'
    : aiUsageSummary.pricedEventCount === 0
      ? 'Usage recorded, provider pricing not configured yet'
      : 'Based on recorded provider usage';

const getDetailSectionTabs = ({
  entityCounts,
  totalEntityCount,
  aiUsageSummary,
}: {
  entityCounts: EntityCounts;
  totalEntityCount: number;
  aiUsageSummary: AIUsageSummary;
}): ReadonlyArray<DetailSectionDefinition> => [
  {
    value: 'sources',
    label: 'Sources',
    description: 'Recent uploads and source links',
    count: entityCounts.sources,
  },
  {
    value: 'podcasts',
    label: 'Podcasts',
    description: 'Latest generated or edited shows',
    count: entityCounts.podcasts,
  },
  {
    value: 'voiceovers',
    label: 'Voiceovers',
    description: 'Narration tracks and status',
    count: entityCounts.voiceovers,
  },
  {
    value: 'personas',
    label: 'Personas',
    description: 'Hosts, voices, and roles',
    count: entityCounts.personas,
  },
  {
    value: 'infographics',
    label: 'Infographics',
    description: 'Generated visuals and formats',
    count: entityCounts.infographics,
  },
  {
    value: 'entity-explorer',
    label: 'Entity explorer',
    description: 'Search and page through everything',
    count: totalEntityCount,
  },
  {
    value: 'ai-usage',
    label: 'AI usage',
    description: 'Provider activity and spend',
    count: aiUsageSummary.totalEvents,
  },
];

const isUsagePeriod = (value: string): value is AIUsagePeriod =>
  USAGE_PERIODS.some((period) => period === value);

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function EntitySection({
  title,
  count,
  accent,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl border px-3 py-2 ${accent}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{count} total</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyEntityState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      No {label.toLowerCase()} yet.
    </div>
  );
}

function UsageBreakdownList<Row extends UsageBreakdownRow>({
  title,
  rows,
  renderLabel,
}: {
  title: string;
  rows: readonly Row[];
  renderLabel: (row: Row) => string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No usage in this period.
          </p>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${title}-${index}-${renderLabel(row)}`}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {renderLabel(row)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.count} events
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatEstimatedCost({
                  estimatedCostUsdMicros: row.estimatedCostUsdMicros,
                  eventCount: row.count,
                  pricedEventCount: row.pricedEventCount,
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EntityItemCard({
  title,
  subtitle,
  updatedAt,
}: {
  title: string;
  subtitle: ReactNode;
  updatedAt: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {formatDate(updatedAt)}
        </p>
      </div>
    </div>
  );
}

function AdminUserSummaryHeader({
  user,
  totalEntityCount,
  usagePeriod,
  aiUsageSummary,
}: {
  user: AdminUserDetail['user'];
  totalEntityCount: number;
  usagePeriod: AIUsagePeriod;
  aiUsageSummary: AIUsageSummary;
}) {
  const estimatedCostDescription = getEstimatedCostDescription(aiUsageSummary);

  return (
    <div className="mb-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-2 px-0">
        <Link to="/admin">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to user search
        </Link>
      </Button>

      <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <AvatarIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {user.name}
                </h1>
                <Badge variant={user.role === 'admin' ? 'purple' : 'default'}>
                  {user.role}
                </Badge>
              </div>
              <p className="mt-2 text-base text-muted-foreground">
                {user.email}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span>User ID {user.id}</span>
                <span>Joined {formatDate(user.createdAt)}</span>
                <span>Updated {formatDate(user.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <StatCard
              label="Entities"
              value={totalEntityCount}
              description="Total tracked content items"
            />
            <StatCard
              label="AI Events"
              value={aiUsageSummary.totalEvents}
              description={`Within the last ${usagePeriod}`}
            />
            <StatCard
              label="Estimated Cost"
              value={formatEstimatedCost({
                estimatedCostUsdMicros:
                  aiUsageSummary.totalEstimatedCostUsdMicros,
                eventCount: aiUsageSummary.totalEvents,
                pricedEventCount: aiUsageSummary.pricedEventCount,
              })}
              description={estimatedCostDescription}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUserSectionTabs({
  tabs,
}: {
  tabs: ReadonlyArray<DetailSectionDefinition>;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Sections</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Jump between user detail areas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open one section at a time instead of scanning a long admin page.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{tabs.length} sections</p>
      </div>

      <TabsList
        aria-label="Admin user detail sections"
        className="mt-5 flex h-auto w-full flex-wrap justify-start gap-2 rounded-3xl bg-muted/30 p-2"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-auto min-w-[160px] flex-1 justify-between gap-3 rounded-2xl border border-transparent px-4 py-3 text-left data-[state=active]:border-border/60 data-[state=active]:bg-background"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {tab.label}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {tab.description}
              </span>
            </span>
            <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground">
              {tab.count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </section>
  );
}

function RecentEntitySection<Item extends RecentEntityRecord>({
  title,
  count,
  accent,
  icon,
  emptyLabel,
  items,
  renderTitle,
  renderSubtitle,
}: {
  title: string;
  count: number;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  emptyLabel: string;
  items: readonly Item[];
  renderTitle: (item: Item) => string;
  renderSubtitle: (item: Item) => ReactNode;
}) {
  return (
    <EntitySection title={title} count={count} icon={icon} accent={accent}>
      {items.length === 0 ? (
        <EmptyEntityState label={emptyLabel} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <EntityItemCard
              key={String(item.id)}
              title={renderTitle(item)}
              subtitle={renderSubtitle(item)}
              updatedAt={item.updatedAt}
            />
          ))}
        </div>
      )}
    </EntitySection>
  );
}

function AdminUserRecentEntityTabs({
  entityCounts,
  recentEntities,
}: {
  entityCounts: EntityCounts;
  recentEntities: RecentEntities;
}) {
  return (
    <>
      <TabsContent value="sources" className="mt-0">
        <RecentEntitySection
          title={ENTITY_META.sources.label}
          count={entityCounts.sources}
          icon={ENTITY_META.sources.icon}
          accent={ENTITY_META.sources.accent}
          emptyLabel="Sources"
          items={recentEntities.sources}
          renderTitle={(source) => source.title}
          renderSubtitle={(source) => `${source.source} · ${source.status}`}
        />
      </TabsContent>

      <TabsContent value="podcasts" className="mt-0">
        <RecentEntitySection
          title={ENTITY_META.podcasts.label}
          count={entityCounts.podcasts}
          icon={ENTITY_META.podcasts.icon}
          accent={ENTITY_META.podcasts.accent}
          emptyLabel="Podcasts"
          items={recentEntities.podcasts}
          renderTitle={(podcast) => podcast.title}
          renderSubtitle={(podcast) => `${podcast.format} · ${podcast.status}`}
        />
      </TabsContent>

      <TabsContent value="voiceovers" className="mt-0">
        <RecentEntitySection
          title={ENTITY_META.voiceovers.label}
          count={entityCounts.voiceovers}
          icon={ENTITY_META.voiceovers.icon}
          accent={ENTITY_META.voiceovers.accent}
          emptyLabel="Voiceovers"
          items={recentEntities.voiceovers}
          renderTitle={(voiceover) => voiceover.title}
          renderSubtitle={(voiceover) =>
            `${voiceover.voice} · ${voiceover.status}`
          }
        />
      </TabsContent>

      <TabsContent value="personas" className="mt-0">
        <RecentEntitySection
          title={ENTITY_META.personas.label}
          count={entityCounts.personas}
          icon={ENTITY_META.personas.icon}
          accent={ENTITY_META.personas.accent}
          emptyLabel="Personas"
          items={recentEntities.personas}
          renderTitle={(persona) => persona.name}
          renderSubtitle={(persona) => (
            <>
              {persona.role ?? 'No role'} ·{' '}
              {persona.voiceName ?? 'No assigned voice'}
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="infographics" className="mt-0">
        <RecentEntitySection
          title={ENTITY_META.infographics.label}
          count={entityCounts.infographics}
          icon={ENTITY_META.infographics.icon}
          accent={ENTITY_META.infographics.accent}
          emptyLabel="Infographics"
          items={recentEntities.infographics}
          renderTitle={(infographic) => infographic.title}
          renderSubtitle={(infographic) =>
            `${infographic.format} · ${infographic.status}`
          }
        />
      </TabsContent>
    </>
  );
}

function DailyActivityCard({
  timeline,
}: {
  timeline: AIUsageSummary['timeline'];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <h3 className="text-sm font-semibold text-foreground">Daily activity</h3>
      <div className="mt-3 space-y-3">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No usage in this period.
          </p>
        ) : (
          timeline.map((point) => (
            <div
              key={point.day}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(point.day)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {point.count} events
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatEstimatedCost({
                  estimatedCostUsdMicros: point.estimatedCostUsdMicros,
                  eventCount: point.count,
                  pricedEventCount: point.pricedEventCount,
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AIUsageEventsTable({ events }: { events: readonly AIUsageEvent[] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-4 border-b border-border/60 bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>Operation</span>
        <span>Status</span>
        <span>Usage</span>
        <span>When</span>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No AI usage events recorded for this period.
        </div>
      ) : (
        events.map((event) => (
          <div
            key={String(event.id)}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-4 border-b border-border/50 px-4 py-4 text-sm last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {event.provider} · {event.providerOperation}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {event.modality}
                {event.model ? ` · ${event.model}` : ''}
                {event.scopeOperation ? ` · ${event.scopeOperation}` : ''}
              </p>
            </div>
            <div>
              <Badge
                variant={
                  STATUS_VARIANT[event.status as keyof typeof STATUS_VARIANT] ??
                  'default'
                }
              >
                {event.status}
              </Badge>
              {event.errorTag ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {event.errorTag}
                </p>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              <p>{summarizeUsage(event.usage ?? {})}</p>
              {typeof event.estimatedCostUsdMicros === 'number' ? (
                <p className="mt-1">
                  {formatCurrency(event.estimatedCostUsdMicros)}
                </p>
              ) : (
                <p className="mt-1">Pricing pending</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <p>{formatDateTime(event.createdAt)}</p>
              {event.resourceType && event.resourceId ? (
                <p className="mt-1">
                  {event.resourceType} · {event.resourceId}
                </p>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AdminUserAIUsageSection({
  usagePeriod,
  onUsagePeriodChange,
  aiUsageSummary,
  aiUsageEvents,
}: {
  usagePeriod: AIUsagePeriod;
  onUsagePeriodChange: (value: AIUsagePeriod) => void;
  aiUsageSummary: AIUsageSummary;
  aiUsageEvents: readonly AIUsageEvent[];
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">AI usage</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Provider activity
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Recorded provider calls for this user, scoped by the selected time
            range.
          </p>
        </div>

        <Tabs
          value={usagePeriod}
          onValueChange={(value) => {
            if (isUsagePeriod(value)) {
              onUsagePeriodChange(value);
            }
          }}
        >
          <TabsList aria-label="AI usage period">
            {USAGE_PERIODS.map((period) => (
              <TabsTrigger key={period} value={period}>
                {period}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <UsageBreakdownList
          title="By modality"
          rows={aiUsageSummary.byModality}
          renderLabel={(row) => row.modality}
        />
        <UsageBreakdownList
          title="By provider"
          rows={aiUsageSummary.byProvider}
          renderLabel={(row) => row.provider}
        />
        <DailyActivityCard timeline={aiUsageSummary.timeline} />
      </div>

      <AIUsageEventsTable events={aiUsageEvents} />
    </section>
  );
}

export function AdminUserDetailPage({
  detail,
  usagePeriod,
  onUsagePeriodChange,
  entityList,
  entityQuery,
  onEntityQueryChange,
  entityType,
  onEntityTypeChange,
  entityPage,
  onEntityPageChange,
  isEntityFetching,
}: AdminUserDetailPageProps) {
  const { user, entityCounts, recentEntities, aiUsageSummary, aiUsageEvents } =
    detail;
  const totalEntityCount = getTotalEntityCount(entityCounts);
  const detailSectionTabs = getDetailSectionTabs({
    entityCounts,
    totalEntityCount,
    aiUsageSummary,
  });

  return (
    <div className="page-container">
      <AdminUserSummaryHeader
        user={user}
        totalEntityCount={totalEntityCount}
        usagePeriod={usagePeriod}
        aiUsageSummary={aiUsageSummary}
      />

      <Tabs defaultValue="sources" className="space-y-6">
        <AdminUserSectionTabs tabs={detailSectionTabs} />
        <AdminUserRecentEntityTabs
          entityCounts={entityCounts}
          recentEntities={recentEntities}
        />

        <TabsContent value="entity-explorer" className="mt-0">
          <AdminUserEntityBrowser
            entityList={entityList}
            searchQuery={entityQuery}
            onSearchChange={onEntityQueryChange}
            entityType={entityType}
            onEntityTypeChange={onEntityTypeChange}
            page={entityPage}
            onPageChange={onEntityPageChange}
            isFetching={isEntityFetching}
          />
        </TabsContent>

        <TabsContent value="ai-usage" className="mt-0">
          <AdminUserAIUsageSection
            usagePeriod={usagePeriod}
            onUsagePeriodChange={onUsagePeriodChange}
            aiUsageSummary={aiUsageSummary}
            aiUsageEvents={aiUsageEvents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
