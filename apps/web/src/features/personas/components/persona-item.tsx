import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';
import { Spinner } from '@repo/ui/components/spinner';
import { memo, useCallback } from 'react';
import type { RouterOutput } from '@repo/api/client';

export type PersonaListItem = RouterOutput['personas']['list'][number];

export interface PersonaItemProps {
  persona: PersonaListItem;
  onEdit: (persona: PersonaListItem) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const PersonaItem = memo(function PersonaItem({
  persona,
  onEdit,
  onDelete,
  isDeleting,
}: PersonaItemProps) {
  const handleDelete = useCallback(() => {
    onDelete(persona.id);
  }, [onDelete, persona.id]);

  const handleEdit = useCallback(() => {
    onEdit(persona);
  }, [onEdit, persona]);

  return (
    <div className="list-card group">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
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
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="list-card-title">{persona.name}</h3>
        <div className="list-card-meta">
          <Badge variant={persona.role === 'host' ? 'purple' : 'default'}>
            {persona.role === 'host' ? 'Host' : 'Co-host'}
          </Badge>
          {persona.voiceName && (
            <span className="text-meta">{persona.voiceName}</span>
          )}
          {persona.personalityDescription && (
            <span className="text-meta truncate max-w-[200px]">
              {persona.personalityDescription}
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
