import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { memo, useCallback } from 'react';
import type { RouterOutput } from '@repo/api/client';

export type AudienceSegmentListItem =
  RouterOutput['audienceSegments']['list'][number];

export interface AudienceItemProps {
  segment: AudienceSegmentListItem;
  onEdit: (segment: AudienceSegmentListItem) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const AudienceItem = memo(function AudienceItem({
  segment,
  onEdit,
  onDelete,
  isDeleting,
}: AudienceItemProps) {
  const handleDelete = useCallback(() => {
    onDelete(segment.id);
  }, [onDelete, segment.id]);

  const handleEdit = useCallback(() => {
    onEdit(segment);
  }, [onEdit, segment]);

  return (
    <div className="list-card group">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="list-card-title">{segment.name}</h3>
        <div className="list-card-meta">
          {segment.messagingTone && (
            <span className="text-meta">{segment.messagingTone}</span>
          )}
          {segment.description && (
            <span className="text-meta truncate max-w-[300px]">
              {segment.description}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil1Icon className="w-4 h-4" />
        </Button>
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
