import { Spinner } from '@repo/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

interface VersionHistoryProps {
  podcastId: string;
  selectedScriptId?: string;
  onSelectVersion: (scriptId: string) => void;
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

export function VersionHistory({
  podcastId,
  selectedScriptId,
  onSelectVersion,
}: VersionHistoryProps) {
  const { data: versions, isPending } = useQuery(
    apiClient.podcasts.listScriptVersions.queryOptions({
      input: { id: podcastId },
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

  // Determine which version is selected - default to active if none specified
  const effectiveSelectedId =
    selectedScriptId ?? versions.find((v) => v.isActive)?.id;

  return (
    <div className="timeline-section">
      <div className="timeline-list">
        {versions.map((v) => {
          const isSelected = v.id === effectiveSelectedId;
          const isViewing = isSelected && !v.isActive;

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelectVersion(v.id)}
              className={`timeline-item ${v.isActive ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
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
                    {isViewing && (
                      <span className="timeline-version-badge viewing">
                        Viewing
                      </span>
                    )}
                  </div>
                </div>
                <p className="timeline-meta">
                  {v.segmentCount} segments · {formatTimeAgo(v.createdAt)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
