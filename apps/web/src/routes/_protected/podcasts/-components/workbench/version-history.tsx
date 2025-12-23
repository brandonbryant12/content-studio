import { CounterClockwiseClockIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
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
      <div className="timeline-section">
        <div className="flex items-center justify-center py-8">
          <Spinner className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="timeline-section">
        <p className="timeline-empty">
          No versions yet. Generate a script to create your first version.
        </p>
      </div>
    );
  }

  return (
    <div className="timeline-section">
      <div className="timeline-list">
        {versions.map((v) => (
          <div
            key={v.id}
            className={`timeline-item ${v.isActive ? 'current' : ''}`}
          >
            {/* Timeline node */}
            <div className="timeline-node" />

            {/* Version card */}
            <div className="timeline-card">
              <div className="timeline-card-header">
                <div className="timeline-version">
                  <span className="timeline-version-number">v{v.version}</span>
                  {v.isActive && (
                    <span className="timeline-version-badge">Current</span>
                  )}
                </div>
                {!v.isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      restoreMutation.mutate({ id: podcastId, scriptId: v.id })
                    }
                    disabled={restoreMutation.isPending}
                    className="timeline-restore-btn"
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
              <p className="timeline-meta">
                {v.segmentCount} segments · {formatTimeAgo(v.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
