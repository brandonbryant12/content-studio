import { ActivityStats } from './activity-stats';
import { ActivityFilters } from './activity-filters';
import { ActivityFeed } from './activity-feed';

type Period = '24h' | '7d' | '30d';

interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  userName?: string | null;
}

interface StatBreakdown {
  readonly field: string;
  readonly count: number;
}

interface TopUser {
  readonly userId: string;
  readonly userName: string;
  readonly count: number;
}

interface ActivityDashboardProps {
  // Stats
  statsTotal: number;
  statsByEntityType: readonly StatBreakdown[];
  statsLoading: boolean;

  // Filters
  period: Period;
  onPeriodChange: (period: Period) => void;
  entityType: string | undefined;
  onEntityTypeChange: (value: string | undefined) => void;
  userId: string | undefined;
  onUserIdChange: (value: string | undefined) => void;
  topUsers: readonly TopUser[];
  searchQuery: string;
  onSearchChange: (value: string) => void;

  // Feed
  activities: ActivityItem[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  feedLoading: boolean;
}

export function ActivityDashboard({
  // Stats
  statsTotal,
  statsByEntityType,
  statsLoading,
  // Filters
  period,
  onPeriodChange,
  entityType,
  onEntityTypeChange,
  userId,
  onUserIdChange,
  topUsers,
  searchQuery,
  onSearchChange,
  // Feed
  activities,
  hasMore,
  onLoadMore,
  isLoadingMore,
  feedLoading,
}: ActivityDashboardProps) {
  return (
    <div className="page-container">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="page-title-lg">Activity</h1>
        <p className="text-body-lg mt-2">
          Monitor all user activity across the platform.
        </p>
      </div>

      <div className="animate-fade-in-up stagger-1">
        <ActivityStats
          total={statsTotal}
          byEntityType={statsByEntityType}
          period={period}
          onPeriodChange={onPeriodChange}
          isLoading={statsLoading}
        />
      </div>

      <div className="animate-fade-in-up stagger-2">
        <ActivityFilters
          entityType={entityType}
          onEntityTypeChange={onEntityTypeChange}
          userId={userId}
          onUserIdChange={onUserIdChange}
          topUsers={topUsers}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      </div>

      <div className="animate-fade-in-up stagger-3">
        <ActivityFeed
          activities={activities}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          isLoading={feedLoading}
        />
      </div>
    </div>
  );
}
