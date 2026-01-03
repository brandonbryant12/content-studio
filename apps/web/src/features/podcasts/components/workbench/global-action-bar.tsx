import {
  CheckIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { VersionStatus, type VersionStatusType } from '../../lib/status';

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
}

export function GlobalActionBar({
  status,
  isGenerating,
  hasChanges,
  isSaving,
  onSave,
  onGenerate,
  disabled,
}: GlobalActionBarProps) {
  // During generation, show progress state
  if (isGenerating) {
    return (
      <div className="global-action-bar">
        <div className="global-action-bar-content">
          <div className="global-action-bar-status">
            <Spinner className="w-4 h-4 text-warning" />
            <span className="global-action-bar-status-text">
              {status === VersionStatus.GENERATING_SCRIPT
                ? 'Generating script...'
                : status === VersionStatus.GENERATING_AUDIO ||
                    status === VersionStatus.SCRIPT_READY
                  ? 'Generating audio...'
                  : 'Processing...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If there are unsaved changes (only possible when ready), show save action
  if (hasChanges && status === VersionStatus.READY) {
    return (
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
              onClick={onSave}
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
                  Save & Regenerate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No changes - show context-aware actions
  return (
    <div className="global-action-bar">
      <div className="global-action-bar-content">
        <div className="global-action-bar-status ready">
          <CheckIcon className="w-4 h-4" />
          <span className="global-action-bar-status-text">
            {status === VersionStatus.READY
              ? 'Ready'
              : status === VersionStatus.FAILED
                ? 'Generation failed'
                : 'Draft'}
          </span>
        </div>
        <div className="global-action-bar-actions">
          {renderContextActions()}
        </div>
      </div>
    </div>
  );

  function renderContextActions() {
    switch (status) {
      case VersionStatus.DRAFTING:
        return (
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={disabled}
            className="global-action-bar-btn-primary"
          >
            <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
            Generate Podcast
          </Button>
        );

      case VersionStatus.READY:
        // No regenerate button when ready with no changes
        // User must make changes to script/settings first
        return null;

      case VersionStatus.FAILED:
        return (
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={disabled}
            className="global-action-bar-btn-primary"
          >
            <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        );

      default:
        return null;
    }
  }
}
