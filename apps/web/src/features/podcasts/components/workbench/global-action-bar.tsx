import {
  CheckIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { ReactNode } from 'react';
import { VersionStatus, type VersionStatusType } from '../../lib/status';
import { getGenerationFailureMessage } from '@/shared/lib/errors';
import { GENERATION_LABELS } from '@/shared/lib/generation-language';

interface GlobalActionBarProps {
  status: VersionStatusType | undefined;
  isGenerating: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onGenerate: () => void;
  disabled?: boolean;
  errorMessage?: string | null;
}

export function GlobalActionBar({
  status,
  isGenerating,
  hasChanges,
  isSaving,
  onSave,
  onGenerate,
  disabled,
  errorMessage,
}: GlobalActionBarProps) {
  const showChangesState =
    hasChanges &&
    (status === VersionStatus.READY || status === VersionStatus.FAILED);

  let statusMessage: string = GENERATION_LABELS.statusDraft;
  if (isGenerating) {
    if (status === VersionStatus.GENERATING_SCRIPT) {
      statusMessage = 'Generating script...';
    } else if (
      status === VersionStatus.GENERATING_AUDIO ||
      status === VersionStatus.SCRIPT_READY
    ) {
      statusMessage = 'Generating audio...';
    } else {
      statusMessage = 'Processing...';
    }
  } else if (showChangesState) {
    statusMessage = GENERATION_LABELS.statusUnsavedChanges;
  } else if (status === VersionStatus.READY) {
    statusMessage = GENERATION_LABELS.statusReady;
  } else if (status === VersionStatus.FAILED) {
    statusMessage = GENERATION_LABELS.statusFailed;
  }

  let action: ReactNode = null;
  if (!isGenerating) {
    if (showChangesState) {
      action = (
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || disabled}
          className="action-bar-btn-primary"
        >
          {isSaving ? (
            <>
              <Spinner className="w-3.5 h-3.5" />
              <span>{GENERATION_LABELS.saving}</span>
            </>
          ) : (
            <>
              <LightningBoltIcon className="w-3.5 h-3.5" />
              <span>{GENERATION_LABELS.saveAndRegenerate}</span>
            </>
          )}
        </Button>
      );
    } else if (status === VersionStatus.DRAFTING) {
      action = (
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={disabled}
          className="action-bar-btn-primary"
        >
          <LightningBoltIcon className="w-3.5 h-3.5" />
          <span>Generate Podcast</span>
        </Button>
      );
    } else if (status === VersionStatus.FAILED) {
      action = (
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={disabled}
          className="action-bar-btn-primary"
        >
          <ReloadIcon className="w-3.5 h-3.5" />
          <span>{GENERATION_LABELS.retry}</span>
        </Button>
      );
    }
  }

  let statusIcon: ReactNode = null;
  if (isGenerating) {
    statusIcon = <Spinner className="w-4 h-4" />;
  } else if (showChangesState) {
    statusIcon = <div className="action-bar-pulse" />;
  } else if (status === VersionStatus.READY) {
    statusIcon = <CheckIcon className="w-4 h-4" />;
  }

  const failureMessage =
    !isGenerating && status === VersionStatus.FAILED
      ? getGenerationFailureMessage(errorMessage)
      : null;

  return (
    <>
      {failureMessage && (
        <div
          className="mx-4 mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {failureMessage}
        </div>
      )}
      <div className={`action-bar-v2 ${showChangesState ? 'has-changes' : ''}`}>
        <div
          className={`action-bar-status ${isGenerating ? 'generating' : ''} ${showChangesState ? 'unsaved' : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusIcon}
          <span>{statusMessage}</span>
        </div>

        <div className="action-bar-actions">{action}</div>
      </div>
    </>
  );
}
