import { Spinner } from '@repo/ui/components/spinner';

interface SetupFooterProps {
  currentStep: number;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  isLoading?: boolean;
  isFinalStep?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
}

export function SetupFooter({
  currentStep,
  onBack,
  onContinue,
  continueDisabled = false,
  isLoading = false,
  isFinalStep = false,
  showSkip = false,
  onSkip,
}: SetupFooterProps) {
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
        {showSkip && onSkip && (
          <button type="button" onClick={onSkip} className="setup-skip-link">
            Skip to workbench
          </button>
        )}
      </div>

      <div className="setup-footer-right">
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || isLoading}
          className={isFinalStep ? 'setup-generate-btn' : 'setup-continue-btn'}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              {isFinalStep ? 'Generating...' : 'Saving...'}
            </span>
          ) : isFinalStep ? (
            'Generate Podcast'
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}
