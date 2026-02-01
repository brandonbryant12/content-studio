// features/brands/components/brand-inputs/persona-card.tsx

import { memo, useState, useCallback, type ChangeEvent } from 'react';
import {
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import type { BrandPersona } from '@repo/db/schema';

interface PersonaCardProps {
  persona: BrandPersona;
  onUpdate: (persona: BrandPersona) => void;
  onDelete: (personaId: string) => void;
  editable?: boolean;
  disabled?: boolean;
}

/**
 * Card component for displaying and editing a brand persona.
 * Supports inline editing when editable prop is true.
 */
export const PersonaCard = memo(function PersonaCard({
  persona,
  onUpdate,
  onDelete,
  editable = true,
  disabled,
}: PersonaCardProps) {
  // Auto-enter edit mode for new/empty personas
  const isEmptyPersona = !persona.name || persona.name.trim().length === 0;
  const [isEditing, setIsEditing] = useState(isEmptyPersona);
  const [editedPersona, setEditedPersona] = useState<BrandPersona>(persona);

  const handleEdit = useCallback(() => {
    setEditedPersona(persona);
    setIsEditing(true);
  }, [persona]);

  const handleCancel = useCallback(() => {
    setEditedPersona(persona);
    setIsEditing(false);
  }, [persona]);

  const handleSave = useCallback(() => {
    onUpdate(editedPersona);
    setIsEditing(false);
  }, [editedPersona, onUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(persona.id);
  }, [persona.id, onDelete]);

  const handleFieldChange = useCallback(
    (field: keyof BrandPersona) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditedPersona((prev) => ({
          ...prev,
          [field]: e.target.value,
        }));
      },
    [],
  );

  if (isEditing) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-primary/50 bg-card p-4 shadow-sm',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        <div className="space-y-3">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              value={editedPersona.name}
              onChange={handleFieldChange('name')}
              placeholder="Persona name"
              disabled={disabled}
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Role
            </label>
            <Input
              value={editedPersona.role}
              onChange={handleFieldChange('role')}
              placeholder="Role or title"
              disabled={disabled}
            />
          </div>

          {/* Personality */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Personality
            </label>
            <Input
              value={editedPersona.personalityDescription}
              onChange={handleFieldChange('personalityDescription')}
              placeholder="Personality description"
              disabled={disabled}
            />
          </div>

          {/* Speaking Style */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Speaking Style
            </label>
            <Input
              value={editedPersona.speakingStyle}
              onChange={handleFieldChange('speakingStyle')}
              placeholder="How this persona speaks"
              disabled={disabled}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={disabled}
            >
              <Cross2Icon className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={disabled || !editedPersona.name.trim()}
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 shadow-sm transition-all',
        'hover:border-border hover:shadow-md',
        disabled && 'opacity-50',
      )}
    >
      {/* Header with name and actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{persona.name}</h4>
          <p className="text-xs text-muted-foreground">{persona.role}</p>
        </div>

        {editable && !disabled && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEdit}
              aria-label="Edit persona"
            >
              <Pencil1Icon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete persona"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Personality description */}
      {persona.personalityDescription && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {persona.personalityDescription}
        </p>
      )}

      {/* Speaking style */}
      {persona.speakingStyle && (
        <div className="mt-2 pt-2 border-t">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Speaking Style
          </span>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {persona.speakingStyle}
          </p>
        </div>
      )}
    </div>
  );
});
