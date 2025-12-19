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
      <div className="flex items-center justify-center py-6">
        <Spinner className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
          <CounterClockwiseClockIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No versions yet
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
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
  };

  return (
    <div className="space-y-2">
      {versions.map((v, idx) => (
        <div
          key={v.id}
          className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
            v.isActive
              ? 'bg-gradient-to-r from-violet-50/80 to-fuchsia-50/50 dark:from-violet-950/30 dark:to-fuchsia-950/20 border-violet-200/60 dark:border-violet-800/40'
              : 'bg-white dark:bg-gray-900/50 border-gray-200/80 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          {/* Version indicator line */}
          {idx < versions.length - 1 && (
            <div className="absolute left-5 top-full w-px h-2 bg-gray-200 dark:bg-gray-700" />
          )}

          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              v.isActive
                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm shadow-violet-500/30'
                : 'bg-gray-300 dark:bg-gray-600'
            }`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  v{v.version}
                </span>
                {v.isActive && (
                  <Badge variant="info" className="text-[10px] px-1.5 py-0 font-medium">
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                {v.segmentCount} segments · {formatDate(v.createdAt)}
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
              className="h-7 px-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:text-violet-300 dark:hover:bg-violet-950/50"
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
