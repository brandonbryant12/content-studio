import { CounterClockwiseClockIcon } from '@radix-ui/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

interface VersionHistoryProps {
  podcastId: string;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function VersionHistory({ podcastId }: VersionHistoryProps) {
  const { data: versions, isPending } = useQuery(
    apiClient.podcasts.listScriptVersions.queryOptions({
      input: { id: podcastId },
    }),
  );

  const restoreMutation = useMutation(
    apiClient.podcasts.restoreScriptVersion.mutationOptions({
      onSuccess: async () => {
        toast.success('Script version restored');
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to restore version');
      },
    }),
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No versions yet
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {versions.map((v) => (
        <div
          key={v.id}
          className={`group flex items-center justify-between p-2.5 rounded-lg border ${
            v.isActive
              ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800'
              : 'bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2 h-2 rounded-full ${
                v.isActive
                  ? 'bg-violet-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                  v{v.version}
                </span>
                {v.isActive && (
                  <Badge variant="info" className="text-[10px] px-1.5 py-0">
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                {v.segmentCount} segments · {formatTimeAgo(v.createdAt)}
              </p>
            </div>
          </div>
          {!v.isActive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                restoreMutation.mutate({ id: podcastId, scriptId: v.id })
              }
              disabled={restoreMutation.isPending}
              className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100"
            >
              {restoreMutation.isPending ? (
                <Spinner className="w-3 h-3" />
              ) : (
                <>
                  <CounterClockwiseClockIcon className="w-3 h-3 mr-1" />
                  Restore
                </>
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
