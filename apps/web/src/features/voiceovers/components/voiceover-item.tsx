import { TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { isGeneratingStatus, type VoiceoverStatusType } from '../lib/status';
import { StatusBadge } from './status-badge';
import { VoiceoverIcon } from './voiceover-icon';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { formatDuration } from '@/shared/lib/formatters';

/** Voiceover data for list display */
export interface VoiceoverListItem {
  id: string;
  title: string;
  text: string;
  voice: string;
  voiceName: string | null;
  audioUrl: string | null;
  createdAt: string;
  status: VoiceoverStatusType;
  duration: number | null;
}

export interface VoiceoverItemProps {
  voiceover: VoiceoverListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

// Memoized to prevent re-renders when parent list re-renders (rerender-memo)
export const VoiceoverItem = memo(function VoiceoverItem({
  voiceover,
  onDelete,
  isDeleting,
}: VoiceoverItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const textPreview = useMemo(
    () =>
      voiceover.text.length > 100
        ? voiceover.text.substring(0, 100) + '...'
        : voiceover.text,
    [voiceover.text],
  );

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setConfirmOpen(false);
    onDelete(voiceover.id);
  }, [onDelete, voiceover.id]);

  return (
    <>
      <div className="content-card group">
        <Link
          to="/voiceovers/$voiceoverId"
          params={{ voiceoverId: voiceover.id }}
          className="flex flex-col flex-1"
        >
          <div className="content-card-thumb thumb-voiceover">
            <VoiceoverIcon status={voiceover.status} />
            {isGeneratingStatus(voiceover.status) && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                <Spinner className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
          <div className="content-card-body">
            <h3 className="content-card-title">{voiceover.title}</h3>
            <div className="content-card-meta">
              <StatusBadge status={voiceover.status} />
              {voiceover.voiceName && (
                <span className="text-meta">{voiceover.voiceName}</span>
              )}
            </div>
            {textPreview && (
              <p className="content-card-description">{textPreview}</p>
            )}
          </div>
        </Link>
        <div className="content-card-footer">
          <div className="flex items-center gap-2">
            {voiceover.duration && (
              <span className="text-meta">
                {formatDuration(voiceover.duration)}
              </span>
            )}
            <span className="text-meta">
              {new Date(voiceover.createdAt).toLocaleDateString()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="content-card-delete h-7 w-7"
            aria-label={`Delete ${voiceover.title}`}
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
        title="Delete Voiceover"
        description="Are you sure you want to delete this voiceover? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
});
