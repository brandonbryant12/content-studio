import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Spinner } from '@repo/ui/components/spinner';
import type { BaseDialogProps, DialogMaxWidth } from './types';

const maxWidthClasses: Record<DialogMaxWidth, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
};

export function BaseDialog({
  open,
  onOpenChange,
  title,
  description,
  maxWidth = 'lg',
  scrollable = false,
  children,
  footer,
}: BaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClasses[maxWidth]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div
          className={
            scrollable
              ? 'py-4 overflow-y-auto overscroll-y-contain max-h-[60vh]'
              : 'py-4'
          }
        >
          {children}
        </div>

        {footer && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {footer.cancelText ?? 'Cancel'}
            </Button>
            <Button
              onClick={footer.onSubmit}
              disabled={footer.isLoading || footer.submitDisabled}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-primary-foreground"
            >
              {footer.isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {footer.loadingText}
                </>
              ) : (
                footer.submitText
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
