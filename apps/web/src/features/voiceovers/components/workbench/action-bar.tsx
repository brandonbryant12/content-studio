import {
  CheckIcon,
  ExclamationTriangleIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { VoiceoverStatus, type VoiceoverStatusType } from '../../lib/status';
import { getGenerationFailureMessage } from '@/shared/lib/errors';
import { GENERATION_LABELS } from '@/shared/lib/generation-language';

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
  const isFailed = status === VoiceoverStatus.FAILED;
  const isReady = status === VoiceoverStatus.READY;
  const isDrafting = status === VoiceoverStatus.DRAFTING;
  const savingContent = (
    <>
      <Spinner className="w-3.5 h-3.5 mr-1.5" />
      {GENERATION_LABELS.saving}
    </>
  );

  const failureMessage =
    !isGenerating && isFailed
      ? getGenerationFailureMessage(errorMessage)
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
        <div className="global-action-bar" role="status" aria-live="polite">
          <div className="global-action-bar-content">
            <div className="global-action-bar-status">
              <Spinner className="w-4 h-4 text-warning" />
              <span className="global-action-bar-status-text">
                {`${GENERATION_LABELS.statusGenerating}...`}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Unsaved changes collapse into a single primary action.
  if (hasChanges) {
    return (
      <>
        {failurePanel}
        <div className="global-action-bar has-changes">
          <div className="global-action-bar-content">
            <div className="global-action-bar-changes">
              <div className="global-action-bar-indicator" />
              <span className="global-action-bar-changes-text">
                {GENERATION_LABELS.statusUnsavedChanges}
              </span>
            </div>
            <div className="global-action-bar-actions">
              {hasText && (
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={isSaving || disabled}
                  className="global-action-bar-btn-primary"
                >
                  {isSaving ? (
                    savingContent
                  ) : (
                    <>
                      <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
                      {GENERATION_LABELS.saveAndRegenerate}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  const statusLabel = isReady
    ? GENERATION_LABELS.statusReady
    : isFailed
      ? GENERATION_LABELS.statusFailed
      : GENERATION_LABELS.statusDraft;

  const generateAction = isDrafting
    ? {
        label: 'Generate Audio',
        icon: <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />,
      }
    : isFailed
      ? {
          label: GENERATION_LABELS.retry,
          icon: <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />,
        }
      : null;
  const shouldShowGenerateAction = generateAction && (isFailed || hasText);

  return (
    <>
      {failurePanel}
      <div className="global-action-bar" role="status" aria-live="polite">
        <div className="global-action-bar-content">
          <div className="global-action-bar-status ready">
            {isReady && <CheckIcon className="w-4 h-4" />}
            {isFailed && <ExclamationTriangleIcon className="w-4 h-4" />}
            <span className="global-action-bar-status-text">{statusLabel}</span>
          </div>
          <div className="global-action-bar-actions">
            {shouldShowGenerateAction && (
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={disabled}
                className="global-action-bar-btn-primary"
              >
                {generateAction.icon}
                {generateAction.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
