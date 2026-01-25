import {
  CheckIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { VersionStatus, type VersionStatusType } from '../../lib/status';
import { AudioPlayer } from '../audio-player';

interface GlobalActionBarProps {
  // Status
  status: VersionStatusType | undefined;
  isGenerating: boolean;

  // Unsaved changes (script or settings)
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;

  // Generation action
  onGenerate: () => void;

  // Disabled state (e.g., viewing history)
  disabled?: boolean;

  // Audio
  audioUrl?: string;
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
}: GlobalActionBarProps) {
  const hasAudio = !!audioUrl;
  const showChangesState = hasChanges && status === VersionStatus.READY;

  // Get status message
  const getStatusMessage = () => {
    if (isGenerating) {
      if (status === VersionStatus.GENERATING_SCRIPT) return 'Generating script...';
      if (status === VersionStatus.GENERATING_AUDIO || status === VersionStatus.SCRIPT_READY) {
        return 'Generating audio...';
      }
      return 'Processing...';
    }
    if (showChangesState) return 'Unsaved changes';
    if (status === VersionStatus.READY) return 'Ready';
    if (status === VersionStatus.FAILED) return 'Generation failed';
    return 'Draft';
  };

  // Get action button
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
              <span>Saving...</span>
            </>
          ) : (
            <>
              <LightningBoltIcon className="w-3.5 h-3.5" />
              <span>Save & Regenerate</span>
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
          <span>Generate</span>
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
          <span>Retry</span>
        </Button>
      );
    }

    return null;
  };

  return (
    <div className={`action-bar-v2 ${showChangesState ? 'has-changes' : ''}`}>
      {/* Left: Status indicator */}
      <div className={`action-bar-status ${isGenerating ? 'generating' : ''} ${showChangesState ? 'unsaved' : ''}`}>
        {isGenerating ? (
          <Spinner className="w-4 h-4" />
        ) : showChangesState ? (
          <div className="action-bar-pulse" />
        ) : status === VersionStatus.READY ? (
          <CheckIcon className="w-4 h-4" />
        ) : null}
        <span>{getStatusMessage()}</span>
      </div>

      {/* Center: Audio player (when available) */}
      {hasAudio && (
        <div className="action-bar-audio">
          <AudioPlayer url={audioUrl} />
        </div>
      )}

      {/* Right: Actions */}
      <div className="action-bar-actions">
        {renderAction()}
      </div>
    </div>
  );
}
