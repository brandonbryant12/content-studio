// features/voiceovers/components/voiceover-item.tsx

import { TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useMemo } from 'react';
import { VoiceoverIcon } from './voiceover-icon';
import {
  type VoiceoverStatusType,
  getStatusConfig,
  isGeneratingStatus,
} from '../lib/status';
import { formatDuration } from '@/shared/lib/formatters';

/** Voiceover data for list display */
export interface VoiceoverListItem {
  id: string;
  title: string;
  text: string;
  voice: string;
  voiceName: string | null;
  createdAt: string;
  status: VoiceoverStatusType;
  duration: number | null;
}

function StatusBadge({ status }: { status: VoiceoverStatusType | undefined }) {
  const config = getStatusConfig(status);
  if (!config) return null;

  return (
    <Badge variant={config.badgeVariant} className="gap-1.5">
      {isGeneratingStatus(status) && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
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
  // Memoize text truncation to avoid recalculation
  const textPreview = useMemo(() => {
    if (voiceover.text.length > 100) {
      return voiceover.text.substring(0, 100) + '...';
    }
    return voiceover.text;
  }, [voiceover.text]);

  // Stable callback - calls parent with id (rerender-memo-with-default-value)
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(voiceover.id);
    },
    [onDelete, voiceover.id],
  );

  return (
    <div className="list-card group overflow-hidden">
      <Link
        to="/voiceovers/$voiceoverId"
        params={{ voiceoverId: voiceover.id }}
        className="flex items-start gap-4 flex-1"
      >
        <VoiceoverIcon status={voiceover.status} />
        <div className="flex-1 min-w-0">
          <h3 className="list-card-title">{voiceover.title}</h3>
          <div className="list-card-meta gap-2 flex-wrap">
            <StatusBadge status={voiceover.status} />
            {voiceover.duration && (
              <span className="text-meta">
                {formatDuration(voiceover.duration)}
              </span>
            )}
            {voiceover.voiceName && (
              <span className="text-meta">{voiceover.voiceName}</span>
            )}
          </div>
          {textPreview && (
            <p className="text-body mt-2 line-clamp-1">{textPreview}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-meta">
          {new Date(voiceover.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="btn-delete"
        >
          {isDeleting ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
});
