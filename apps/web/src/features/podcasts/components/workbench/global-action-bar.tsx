import {
  CheckIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { VersionStatus, type VersionStatusType } from '../../lib/status';
import { AudioPlayer } from '../audio-player';
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
  audioUrl?: string;
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
  audioUrl,
  errorMessage,
}: GlobalActionBarProps) {
  const hasAudio = !!audioUrl;
  const showChangesState =
    hasChanges &&
    (status === VersionStatus.READY || status === VersionStatus.FAILED);

  const getStatusMessage = () => {
    if (isGenerating) {
      if (status === VersionStatus.GENERATING_SCRIPT)
        return 'Generating script...';
      if (
        status === VersionStatus.GENERATING_AUDIO ||
        status === VersionStatus.SCRIPT_READY
      ) {
        return 'Generating audio...';
      }
      return 'Processing...';
    }
    if (showChangesState) return GENERATION_LABELS.statusUnsavedChanges;
    if (status === VersionStatus.READY) return GENERATION_LABELS.statusReady;
    if (status === VersionStatus.FAILED) return GENERATION_LABELS.statusFailed;
    return GENERATION_LABELS.statusDraft;
  };

  const renderAction = () => {
    if (isGenerating) return null;

    if (showChangesState) {
      return (
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
    }

    if (status === VersionStatus.DRAFTING) {
      return (
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
    }

    if (status === VersionStatus.FAILED) {
      return (
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

    return null;
  };

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
          {isGenerating ? (
            <Spinner className="w-4 h-4" />
          ) : showChangesState ? (
            <div className="action-bar-pulse" />
          ) : status === VersionStatus.READY ? (
            <CheckIcon className="w-4 h-4" />
          ) : null}
          <span>{getStatusMessage()}</span>
        </div>

        {hasAudio && (
          <div className="action-bar-audio">
            <AudioPlayer url={audioUrl} />
          </div>
        )}

        <div className="action-bar-actions">{renderAction()}</div>
      </div>
    </>
  );
}
