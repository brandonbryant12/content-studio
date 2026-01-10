// features/infographics/components/workbench/global-action-bar.tsx

import {
  CheckIcon,
  LightningBoltIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import {
  InfographicStatus,
  type InfographicStatusType,
} from '../../lib/status';

export interface InfographicActionBarProps {
  /** Current infographic status */
  status: InfographicStatusType | undefined;
  /** Whether generation is in progress */
  isGenerating: boolean;

  /** Whether there are unsaved changes (settings or selections) */
  hasChanges: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Save handler */
  onSave: () => void;

  /** Generation handler */
  onGenerate: () => void;

  /** Whether actions should be disabled (e.g., during generation) */
  disabled?: boolean;
}

/**
 * Action bar for infographic workbench.
 * Shows context-aware actions based on status and unsaved changes.
 *
 * States:
 * - Generating: Shows spinner with progress message
 * - Has changes: Shows "Unsaved changes" indicator with Save button
 * - Ready/Failed/Drafting: Shows context action (Generate/Retry)
 */
export function InfographicActionBar({
  status,
  isGenerating,
  hasChanges,
  isSaving,
  onSave,
  onGenerate,
  disabled,
}: InfographicActionBarProps) {
  // During generation, show progress state
  if (isGenerating) {
    return (
      <div className="global-action-bar">
        <div className="global-action-bar-content">
          <div className="global-action-bar-status">
            <Spinner className="w-4 h-4 text-purple-500" />
            <span className="global-action-bar-status-text">
              Generating infographic...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If there are unsaved changes, show save action
  if (hasChanges) {
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
                  Save Changes
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
            {status === InfographicStatus.READY
              ? 'Ready'
              : status === InfographicStatus.FAILED
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
      case InfographicStatus.DRAFTING:
        return (
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={disabled}
            className="global-action-bar-btn-primary"
          >
            <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
            Generate Infographic
          </Button>
        );

      case InfographicStatus.READY:
        // Show regenerate option when ready
        return (
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={disabled}
            className="global-action-bar-btn-primary"
          >
            <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
            Regenerate
          </Button>
        );

      case InfographicStatus.FAILED:
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
