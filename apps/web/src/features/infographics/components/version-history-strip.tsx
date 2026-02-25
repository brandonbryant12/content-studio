import { memo } from 'react';
import type { InfographicVersion } from '../hooks/use-infographic-versions';
import { getStorageUrl } from '@/shared/lib/storage-url';

interface VersionHistoryStripProps {
  versions: readonly InfographicVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  latestVersionNumber: number | null;
  onUseLatestBase: () => void;
  isLoading?: boolean;
}

const VersionCard = memo(function VersionCard({
  version,
  isSelected,
  onSelect,
}: {
  version: InfographicVersion;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const previewKey = version.thumbnailStorageKey ?? version.imageStorageKey;
  const previewUrl = previewKey ? getStorageUrl(previewKey) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border/40 hover:border-border hover:bg-muted/50'
      }`}
      aria-label={`Version ${version.versionNumber}`}
      aria-pressed={isSelected}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`Version ${version.versionNumber} preview`}
          className="w-16 h-16 object-cover rounded"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded bg-muted/40 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            v{version.versionNumber}
          </span>
        </div>
      )}
      <span className="text-[10px] font-medium text-muted-foreground">
        v{version.versionNumber}
      </span>
    </button>
  );
});

export function VersionHistoryStrip({
  versions,
  selectedVersionId,
  onSelectVersion,
  latestVersionNumber,
  onUseLatestBase,
  isLoading,
}: VersionHistoryStripProps) {
  const selectedVersion =
    selectedVersionId !== null
      ? (versions.find((version) => version.id === selectedVersionId) ?? null)
      : null;
  const viewingVersionNumber =
    selectedVersion?.versionNumber ?? latestVersionNumber;
  const isViewingHistoricalVersion =
    selectedVersion !== null && selectedVersion.versionNumber !== latestVersionNumber;

  return (
    <div className="shrink-0 border-t border-border bg-card px-5 py-3">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading versions...</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No versions yet — generate your first infographic to see version
          history
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Versions ({versions.length})
            </p>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                Viewing v{viewingVersionNumber ?? '—'}
              </span>
              <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary">
                Base v{latestVersionNumber ?? '—'}
              </span>
              {isViewingHistoricalVersion ? (
                <button
                  type="button"
                  onClick={onUseLatestBase}
                  className="rounded-full border border-border px-2 py-0.5 text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  Use latest as base
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5" role="list">
            {versions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                isSelected={selectedVersionId === version.id}
                onSelect={() => onSelectVersion(version.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
