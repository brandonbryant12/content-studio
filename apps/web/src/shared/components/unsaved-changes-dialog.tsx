import type { NavigationBlocker } from '@/shared/hooks';
import { ConfirmationDialog } from './confirmation-dialog/confirmation-dialog';

interface UnsavedChangesDialogProps {
  blocker: NavigationBlocker;
}

export function UnsavedChangesDialog({ blocker }: UnsavedChangesDialogProps) {
  if (!blocker.isBlocked) return null;

  return (
    <ConfirmationDialog
      open
      onOpenChange={(open) => {
        if (!open) blocker.reset();
      }}
      title="Unsaved Changes"
      description="You have unsaved changes. If you leave this page, your changes will be lost."
      confirmText="Leave Page"
      cancelText="Stay"
      variant="warning"
      onConfirm={() => blocker.proceed()}
    />
  );
}
