import {
  CheckIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { VoiceoverStatus, type VoiceoverStatusType } from '../../lib/status';

interface ActionBarProps {
  status: VoiceoverStatusType | undefined;
  isGenerating: boolean;
  hasChanges: boolean;
  hasText: boolean;
  isSaving: boolean;
  onGenerate: () => void;
  disabled?: boolean;
}

export function ActionBar({
  status,
  isGenerating,
  hasChanges,
  hasText,
  isSaving,
  onGenerate,
  disabled,
}: ActionBarProps) {
  // During generation, show progress state
  if (isGenerating) {
    return (
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
    );
  }

  // Has changes + hasText: show "Save & Generate" or "Save & Regenerate" button
  if (hasChanges && hasText) {
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
    );
  }

  const statusLabel =
    status === VoiceoverStatus.READY
      ? 'Ready'
      : status === VoiceoverStatus.FAILED
        ? 'Generation failed'
        : 'Draft';

  return (
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
  );
}
