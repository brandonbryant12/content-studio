import { Spinner } from '@repo/ui/components/spinner';

interface SetupFooterProps {
  currentStep: number;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  isLoading?: boolean;
  isFinalStep?: boolean;
  subtitle?: string;
  continueLabel?: string;
  loadingLabel?: string;
  secondaryAction?: {
    label: string;
    loadingLabel?: string;
    onClick: () => void;
    disabled?: boolean;
    isLoading?: boolean;
  };
}

export function SetupFooter({
  currentStep,
  onBack,
  onContinue,
  continueDisabled = false,
  isLoading = false,
  isFinalStep = false,
  subtitle,
  continueLabel,
  loadingLabel,
  secondaryAction,
}: SetupFooterProps) {
  const resolvedContinueLabel =
    continueLabel ?? (isFinalStep ? 'Generate Podcast' : 'Continue');
  const resolvedLoadingLabel =
    loadingLabel ?? (isFinalStep ? 'Generating...' : 'Saving...');

  return (
    <div className="setup-footer">
      <div className="setup-footer-left">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="setup-back-btn"
          >
            Back
          </button>
        )}
      </div>

      <div className="setup-footer-right">
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled || secondaryAction.isLoading}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {secondaryAction.isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                {secondaryAction.loadingLabel ?? secondaryAction.label}
              </span>
            ) : (
              secondaryAction.label
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || isLoading}
          className={isFinalStep ? 'setup-generate-btn' : 'setup-continue-btn'}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              {resolvedLoadingLabel}
            </span>
          ) : (
            resolvedContinueLabel
          )}
        </button>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
