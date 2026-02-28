import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';

interface ChatAutoTriggerConfirmationProps {
  actionLabel: string;
  isPending: boolean;
  pendingLabel: string;
  error: Error | undefined;
  onConfirm: () => void;
  onKeepRefining: () => void;
}

export function ChatAutoTriggerConfirmation({
  actionLabel,
  isPending,
  pendingLabel,
  error,
  onConfirm,
  onKeepRefining,
}: ChatAutoTriggerConfirmationProps) {
  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
          Something went wrong. Please try again.
        </p>
      )}
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground">Ready to proceed?</p>
        <div className="flex gap-2">
          <Button onClick={onConfirm} disabled={isPending} size="sm">
            {isPending ? (
              <>
                <Spinner className="w-3.5 h-3.5 mr-1.5" />
                {pendingLabel}
              </>
            ) : error ? (
              'Retry'
            ) : (
              actionLabel
            )}
          </Button>
          <Button
            onClick={onKeepRefining}
            disabled={isPending}
            variant="ghost"
            size="sm"
          >
            Keep Refining
          </Button>
        </div>
      </div>
    </div>
  );
}
