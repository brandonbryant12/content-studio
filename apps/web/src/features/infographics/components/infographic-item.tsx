import { CheckCircledIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useState } from 'react';
import {
  type InfographicStatusType,
  getStatusConfig,
  isGeneratingStatus,
} from '../lib/status';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useImageFallback } from '@/shared/hooks/use-image-fallback';
import { formatDate } from '@/shared/lib/formatters';
import { getStorageUrl } from '@/shared/lib/storage-url';

export interface InfographicListItem {
  id: string;
  title: string;
  prompt: string | null;
  format: string;
  status: InfographicStatusType;
  imageStorageKey: string | null;
  createdAt: string;
  approvedBy: string | null;
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

const FORMAT_LABELS: Record<string, string> = {
  portrait: 'Portrait',
  square: 'Square',
  landscape: 'Landscape',
  og_card: 'OG Card',
};

interface InfographicItemProps {
  infographic: InfographicListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isSelected?: boolean;
  hasSelection?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const InfographicItem = memo(function InfographicItem({
  infographic,
  onDelete,
  isDeleting,
  isSelected,
  hasSelection,
  onToggleSelect,
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

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect?.(infographic.id);
    },
    [onToggleSelect, infographic.id],
  );

  const image = useImageFallback(
    infographic.imageStorageKey
      ? getStorageUrl(infographic.imageStorageKey)
      : null,
  );

  return (
    <>
      <div
        role="listitem"
        className="content-card group"
        data-selected={isSelected || undefined}
      >
        <div className="content-card-thumb thumb-infographic">
          {onToggleSelect && (
            <div
              className="content-card-checkbox"
              data-visible={hasSelection || isSelected || undefined}
            >
              <Checkbox
                checked={isSelected}
                onClick={handleCheckboxClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleSelect?.(infographic.id);
                  }
                }}
                aria-label={`Select ${infographic.title}`}
              />
            </div>
          )}
          <img
            src={image.src ?? '/default-infographic.svg'}
            alt={`${infographic.title} preview`}
            loading="lazy"
            onError={image.src ? image.onError : undefined}
          />
          {isGeneratingStatus(infographic.status) && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
              <Spinner className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
        <Link
          to="/infographics/$infographicId"
          params={{ infographicId: infographic.id }}
          className="stretched-link flex flex-col flex-1"
        >
          <div className="content-card-body">
            <h3 className="content-card-title">{infographic.title}</h3>
            <div className="content-card-meta">
              <StatusBadge status={infographic.status} />
              <span className="text-meta">
                {FORMAT_LABELS[infographic.format] ?? infographic.format}
              </span>
              {infographic.approvedBy && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircledIcon className="w-3 h-3" />
                  Approved
                </span>
              )}
            </div>
          </div>
        </Link>
        <div className="content-card-footer">
          <span className="text-meta">{formatDate(infographic.createdAt)}</span>
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
        description={`Are you sure you want to delete "${infographic.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
});
