import {
  CheckIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { VoiceoverStatus, type VoiceoverStatusType } from '../../lib/status';
import { getErrorMessage } from '@/shared/lib/errors';

interface ActionBarProps {
  status: VoiceoverStatusType | undefined;
  errorMessage?: string | null;
  isGenerating: boolean;
  hasChanges: boolean;
  hasText: boolean;
  isSaving: boolean;
  onGenerate: () => void;
  disabled?: boolean;
}

export function ActionBar({
  status,
  errorMessage,
  isGenerating,
  hasChanges,
  hasText,
  isSaving,
  onGenerate,
  disabled,
}: ActionBarProps) {
  const failureMessage =
    !isGenerating &&
    status === VoiceoverStatus.FAILED &&
    typeof errorMessage === 'string' &&
    errorMessage.trim().length > 0
      ? getErrorMessage(
          { message: errorMessage },
          'Generation failed. Please retry.',
        )
      : null;

  const failurePanel = failureMessage ? (
    <div
      className="mx-4 mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {failureMessage}
    </div>
  ) : null;

  // During generation, show progress state
  if (isGenerating) {
    return (
      <>
        {failurePanel}
        <div className="global-action-bar">
          <div className="global-action-bar-content">
            <div className="global-action-bar-status">
              <Spinner className="w-4 h-4 text-warning" />
              <span className="global-action-bar-status-text">
                Generating audio...
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Has changes + hasText: show "Save & Generate" or "Save & Regenerate" button
  if (hasChanges && hasText) {
    return (
      <>
        {failurePanel}
        <div className="global-action-bar has-changes">
          <div className="global-action-bar-content">
            <div className="global-action-bar-changes">
              <div className="global-action-bar-indicator" />
              <span className="global-action-bar-changes-text">
                Unsaved changes
              </span>
            </div>
            <div className="global-action-bar-actions">
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={isSaving || disabled}
                className="global-action-bar-btn-primary"
              >
                {isSaving ? (
                  <>
                    <Spinner className="w-3.5 h-3.5 mr-1.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
                    {status === VoiceoverStatus.READY
                      ? 'Save & Regenerate'
                      : 'Save & Generate'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const statusLabel =
    status === VoiceoverStatus.READY
      ? 'Ready'
      : status === VoiceoverStatus.FAILED
        ? 'Generation failed'
        : 'Draft';

  return (
    <>
      {failurePanel}
      <div className="global-action-bar">
        <div className="global-action-bar-content">
          <div className="global-action-bar-status ready">
            <CheckIcon className="w-4 h-4" />
            <span className="global-action-bar-status-text">{statusLabel}</span>
          </div>
          <div className="global-action-bar-actions">
            {status === VoiceoverStatus.DRAFTING && hasText && (
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={disabled}
                className="global-action-bar-btn-primary"
              >
                <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
                Generate Audio
              </Button>
            )}
            {status === VoiceoverStatus.FAILED && (
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={disabled}
                className="global-action-bar-btn-primary"
              >
                <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
