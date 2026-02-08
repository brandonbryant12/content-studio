import { TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useState } from 'react';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { getStorageUrl } from '@/shared/lib/storage-url';
import {
  type InfographicStatusType,
  getStatusConfig,
  isGeneratingStatus,
} from '../lib/status';

export interface InfographicListItem {
  id: string;
  title: string;
  prompt: string | null;
  infographicType: string;
  stylePreset: string;
  format: string;
  status: InfographicStatusType;
  imageStorageKey: string | null;
  createdAt: string;
}

function StatusBadge({
  status,
}: {
  status: InfographicStatusType | undefined;
}) {
  const config = getStatusConfig(status);
  if (!config) return null;

  return (
    <Badge variant={config.badgeVariant} className="gap-1.5">
      {isGeneratingStatus(status) && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

const TYPE_LABELS: Record<string, string> = {
  timeline: 'Timeline',
  comparison: 'Comparison',
  stats_dashboard: 'Stats Dashboard',
  key_takeaways: 'Key Takeaways',
};

const FORMAT_LABELS: Record<string, string> = {
  portrait: 'Portrait',
  square: 'Square',
  landscape: 'Landscape',
  og_card: 'OG Card',
};

export interface InfographicItemProps {
  infographic: InfographicListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const InfographicItem = memo(function InfographicItem({
  infographic,
  onDelete,
  isDeleting,
}: InfographicItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setConfirmOpen(false);
    onDelete(infographic.id);
  }, [onDelete, infographic.id]);

  const imageUrl = infographic.imageStorageKey
    ? getStorageUrl(infographic.imageStorageKey)
    : null;

  return (
    <>
      <div className="content-card group">
        <Link
          to="/infographics/$infographicId"
          params={{ infographicId: infographic.id }}
          className="flex flex-col flex-1"
        >
          <div className="content-card-thumb">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${infographic.title} preview`}
                loading="lazy"
              />
            ) : (
              <div className="content-card-thumb-icon bg-amber-500/10">
                <svg
                  className="w-6 h-6 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
              </div>
            )}
            {isGeneratingStatus(infographic.status) && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                <Spinner className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
          <div className="content-card-body">
            <h3 className="content-card-title">{infographic.title}</h3>
            <div className="content-card-meta">
              <StatusBadge status={infographic.status} />
              <span className="text-meta">
                {TYPE_LABELS[infographic.infographicType] ??
                  infographic.infographicType}
              </span>
            </div>
          </div>
        </Link>
        <div className="content-card-footer">
          <div className="flex items-center gap-2">
            <span className="text-meta">
              {FORMAT_LABELS[infographic.format] ?? infographic.format}
            </span>
            <span className="text-meta">
              {new Date(infographic.createdAt).toLocaleDateString()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="content-card-delete h-7 w-7"
            aria-label={`Delete ${infographic.title}`}
          >
            {isDeleting ? (
              <Spinner className="w-3.5 h-3.5" />
            ) : (
              <TrashIcon className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Infographic"
        description="Are you sure you want to delete this infographic? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
});
