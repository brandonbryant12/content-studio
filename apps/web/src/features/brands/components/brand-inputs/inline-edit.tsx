// features/brands/components/brand-inputs/inline-edit.tsx
// Inline editable text component for review step

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Pencil1Icon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';
import { Button } from '@repo/ui/components/button';

export interface InlineEditProps {
  /** Current value */
  value: string;
  /** Callback when value is saved */
  onSave: (value: string) => Promise<void> | void;
  /** Whether the field is currently saving */
  isSaving?: boolean;
  /** Placeholder when empty */
  placeholder?: string;
  /** Use textarea instead of input */
  multiline?: boolean;
  /** Additional className for the display text */
  className?: string;
  /** Render as a specific element type */
  as?: 'p' | 'span' | 'h3';
}

/**
 * Inline editable text component.
 * Click to edit, save on Enter/blur, cancel on Escape.
 */
export const InlineEdit = memo(function InlineEdit({
  value,
  onSave,
  isSaving = false,
  placeholder = 'Click to edit…',
  multiline = false,
  className,
  as: Component = 'p',
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync edit value when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!isSaving) {
      setIsEditing(true);
      setEditValue(value);
    }
  }, [isSaving, value]);

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      await onSave(trimmed);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [multiline, handleSave, handleCancel],
  );

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input;
    return (
      <div className="flex items-start gap-2">
        <InputComponent
          ref={
            inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>
          }
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className={cn('flex-1', multiline && 'min-h-[80px]')}
          placeholder={placeholder}
          rows={multiline ? 3 : undefined}
        />
        <div className="flex gap-1 pt-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 w-7"
            type="button"
          >
            <CheckIcon className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-7 w-7"
            type="button"
          >
            <Cross2Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Component
      onClick={handleStartEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${value || placeholder}`}
      className={cn(
        'group cursor-pointer rounded px-2 py-1 -mx-2 -my-1',
        'hover:bg-muted/50 focus:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring',
        'transition-colors duration-150',
        !value && 'text-muted-foreground italic',
        isSaving && 'opacity-50 cursor-wait',
        className,
      )}
    >
      {value || placeholder}
      <Pencil1Icon className="inline-block ml-2 h-3 w-3 opacity-0 group-hover:opacity-50 group-focus:opacity-50 transition-opacity" />
    </Component>
  );
});
