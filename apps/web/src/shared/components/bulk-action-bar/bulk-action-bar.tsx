import { TrashIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Spinner } from '@repo/ui/components/spinner';
import { useState, useCallback } from 'react';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isDeleting: boolean;
  entityName: string;
  onToggleAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  isAllSelected,
  isIndeterminate,
  isDeleting,
  entityName,
  onToggleAll,
  onDeselectAll,
  onDeleteSelected,
}: BulkActionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setConfirmOpen(false);
    onDeleteSelected();
  }, [onDeleteSelected]);

  if (selectedCount === 0) return null;

  const plural = selectedCount > 1 ? 's' : '';

  return (
    <>
      <div className="bulk-action-bar" role="toolbar" aria-label="Bulk actions">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isIndeterminate ? 'indeterminate' : isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label={
              isAllSelected
                ? 'Deselect all'
                : `Select all ${totalCount} ${entityName}s`
            }
          />
          <span className="text-sm font-medium tabular-nums">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="text-xs text-muted-foreground h-7 px-2"
          >
            <Cross2Icon className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Spinner className="w-3.5 h-3.5 mr-1.5" />
              Deleting...
            </>
          ) : (
            <>
              <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
              Delete {selectedCount} {entityName}
              {plural}
            </>
          )}
        </Button>
      </div>
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${selectedCount} ${entityName}${plural}`}
        description={`Are you sure you want to delete ${selectedCount} ${entityName}${plural}? This action cannot be undone.`}
        confirmText={`Delete ${selectedCount} ${entityName}${plural}`}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
