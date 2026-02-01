// features/brands/components/brand-inputs/segment-card.tsx

import { memo, useState, useCallback, type ChangeEvent } from 'react';
import {
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import type { BrandSegment } from '@repo/db/schema';

interface SegmentCardProps {
  segment: BrandSegment;
  onUpdate: (segment: BrandSegment) => void;
  onDelete: (segmentId: string) => void;
  editable?: boolean;
  disabled?: boolean;
}

/**
 * Card component for displaying and editing a brand segment.
 * Supports inline editing when editable prop is true.
 */
export const SegmentCard = memo(function SegmentCard({
  segment,
  onUpdate,
  onDelete,
  editable = true,
  disabled,
}: SegmentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSegment, setEditedSegment] = useState<BrandSegment>(segment);
  const [benefitsInput, setBenefitsInput] = useState('');

  const handleEdit = useCallback(() => {
    setEditedSegment(segment);
    setIsEditing(true);
  }, [segment]);

  const handleCancel = useCallback(() => {
    setEditedSegment(segment);
    setBenefitsInput('');
    setIsEditing(false);
  }, [segment]);

  const handleSave = useCallback(() => {
    onUpdate(editedSegment);
    setIsEditing(false);
    setBenefitsInput('');
  }, [editedSegment, onUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(segment.id);
  }, [segment.id, onDelete]);

  const handleFieldChange = useCallback(
    (field: keyof Omit<BrandSegment, 'keyBenefits'>) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditedSegment((prev) => ({
          ...prev,
          [field]: e.target.value,
        }));
      },
    [],
  );

  const handleAddBenefit = useCallback(() => {
    const trimmed = benefitsInput.trim();
    if (trimmed && !editedSegment.keyBenefits.includes(trimmed)) {
      setEditedSegment((prev) => ({
        ...prev,
        keyBenefits: [...prev.keyBenefits, trimmed],
      }));
      setBenefitsInput('');
    }
  }, [benefitsInput, editedSegment.keyBenefits]);

  const handleRemoveBenefit = useCallback((benefit: string) => {
    setEditedSegment((prev) => ({
      ...prev,
      keyBenefits: prev.keyBenefits.filter((b) => b !== benefit),
    }));
  }, []);

  const handleBenefitsKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddBenefit();
      }
    },
    [handleAddBenefit],
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
              value={editedSegment.name}
              onChange={handleFieldChange('name')}
              placeholder="Segment name"
              disabled={disabled}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Input
              value={editedSegment.description}
              onChange={handleFieldChange('description')}
              placeholder="Who this segment represents"
              disabled={disabled}
            />
          </div>

          {/* Messaging Tone */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Messaging Tone
            </label>
            <Input
              value={editedSegment.messagingTone}
              onChange={handleFieldChange('messagingTone')}
              placeholder="How to communicate with this segment"
              disabled={disabled}
            />
          </div>

          {/* Key Benefits */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Key Benefits
            </label>

            {/* Current benefits as chips */}
            {editedSegment.keyBenefits.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {editedSegment.keyBenefits.map((benefit) => (
                  <Badge
                    key={benefit}
                    variant="default"
                    className="pl-2 pr-1 py-1 gap-1 text-xs"
                  >
                    {benefit}
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(benefit)}
                      className="ml-1 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                      aria-label={`Remove ${benefit}`}
                    >
                      <Cross2Icon className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add benefit input */}
            <div className="flex items-center gap-2">
              <Input
                value={benefitsInput}
                onChange={(e) => setBenefitsInput(e.target.value)}
                onKeyDown={handleBenefitsKeyDown}
                placeholder="Add a benefit..."
                disabled={disabled}
                className="flex-1 h-9 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBenefit}
                disabled={disabled || !benefitsInput.trim()}
              >
                Add
              </Button>
            </div>
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
              disabled={disabled || !editedSegment.name.trim()}
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
          <h4 className="font-semibold text-sm truncate">{segment.name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {segment.description}
          </p>
        </div>

        {editable && !disabled && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEdit}
              aria-label="Edit segment"
            >
              <Pencil1Icon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete segment"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Messaging tone */}
      {segment.messagingTone && (
        <div className="mt-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Tone
          </span>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {segment.messagingTone}
          </p>
        </div>
      )}

      {/* Key benefits */}
      {segment.keyBenefits.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Key Benefits
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {segment.keyBenefits.slice(0, 3).map((benefit) => (
              <Badge
                key={benefit}
                variant="default"
                className="text-[10px] px-1.5 py-0.5"
              >
                {benefit}
              </Badge>
            ))}
            {segment.keyBenefits.length > 3 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                +{segment.keyBenefits.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
