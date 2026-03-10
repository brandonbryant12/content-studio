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
  onSave: () => void;
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
  onSave,
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
    !isGenerating && isFailed ? getGenerationFailureMessage(errorMessage) : null;

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

  // Has changes: always expose explicit save action. Generate is separate.
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
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Cmd/Ctrl+S
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={onSave}
                disabled={isSaving || disabled}
                className="global-action-bar-btn-secondary"
              >
                {isSaving ? savingContent : 'Save Draft'}
              </Button>
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
    ? (
        <>
          <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
          Generate Audio
        </>
      )
    : isFailed
      ? (
          <>
            <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
            {GENERATION_LABELS.retry}
          </>
        )
      : null;

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
            {generateAction && (isFailed || hasText) && (
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={disabled}
                className="global-action-bar-btn-primary"
              >
                {generateAction}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
