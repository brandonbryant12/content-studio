import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';

interface DocumentDetailUnsavedChangesBarProps {
  isSaving: boolean;
  title: string;
  onDiscard: () => void;
  onSave: () => void;
}

export function DocumentDetailUnsavedChangesBar({
  isSaving,
  title,
  onDiscard,
  onSave,
}: DocumentDetailUnsavedChangesBarProps) {
  return (
    <div className="workbench-action-bar">
      <div className="flex items-center justify-between w-full px-6">
        <span className="text-sm text-muted-foreground">
          Unsaved title changes
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={isSaving}
            type="button"
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !title.trim()}
            type="button"
          >
            {isSaving ? (
              <>
                <Spinner className="w-3.5 h-3.5 mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
