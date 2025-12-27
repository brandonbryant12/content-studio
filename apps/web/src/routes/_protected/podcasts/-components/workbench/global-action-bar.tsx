import {
  CheckIcon,
  ChevronDownIcon,
  LightningBoltIcon,
  PlayIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Spinner } from '@repo/ui/components/spinner';
import type { VersionStatus } from '../../-constants/status';

type PendingAction = 'script' | 'audio' | 'all' | null;

interface GlobalActionBarProps {
  // Status
  status: VersionStatus | undefined;
  hasScript: boolean;
  isGenerating: boolean;
  pendingAction: PendingAction;

  // Script changes
  hasScriptChanges: boolean;
  isScriptSaving: boolean;
  onSaveScript: () => void;

  // Settings changes (voice, duration, instructions)
  hasSettingsChanges: boolean;
  isSettingsSaving: boolean;
  onSaveSettings: () => Promise<void>;

  // Generation actions
  onGenerateScript: () => void;
  onGenerateAudio: () => void;
  onGenerateAll: () => void;

  // Disabled state (e.g., viewing history)
  disabled?: boolean;
}

export function GlobalActionBar({
  status,
  hasScript,
  isGenerating,
  pendingAction,
  hasScriptChanges,
  isScriptSaving,
  onSaveScript,
  hasSettingsChanges,
  isSettingsSaving,
  onSaveSettings,
  onGenerateScript,
  onGenerateAudio,
  onGenerateAll,
  disabled,
}: GlobalActionBarProps) {
  const hasAnyChanges = hasScriptChanges || hasSettingsChanges;
  const isAnySaving = isScriptSaving || isSettingsSaving;
  const showBar = hasAnyChanges || !disabled;

  if (!showBar) return null;

  // Handle unified save - saves both script and settings if needed
  const handleSaveAll = async () => {
    if (hasScriptChanges) {
      onSaveScript();
    }
    if (hasSettingsChanges) {
      await onSaveSettings();
    }
  };

  // Handle save and regenerate
  const handleSaveAndRegenerate = async () => {
    await handleSaveAll();
    // Trigger regeneration after save
    onGenerateAll();
  };

  // During generation, show progress state
  if (pendingAction !== null || isGenerating) {
    return (
      <div className="global-action-bar">
        <div className="global-action-bar-content">
          <div className="global-action-bar-status">
            <Spinner className="w-4 h-4 text-warning" />
            <span className="global-action-bar-status-text">
              {status === 'draft'
                ? 'Generating script...'
                : status === 'generating_audio'
                  ? 'Generating audio...'
                  : 'Processing...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If there are unsaved changes, show save options
  if (hasAnyChanges) {
    return (
      <div className="global-action-bar has-changes">
        <div className="global-action-bar-content">
          <div className="global-action-bar-changes">
            <div className="global-action-bar-indicator" />
            <span className="global-action-bar-changes-text">
              {hasScriptChanges && hasSettingsChanges
                ? 'Script & settings changed'
                : hasScriptChanges
                  ? 'Script changed'
                  : 'Settings changed'}
            </span>
          </div>
          <div className="global-action-bar-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveAll}
              disabled={isAnySaving || disabled}
              className="global-action-bar-btn-secondary"
            >
              {isAnySaving ? (
                <>
                  <Spinner className="w-3.5 h-3.5 mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAndRegenerate}
              disabled={isAnySaving || disabled}
              className="global-action-bar-btn-primary"
            >
              {isAnySaving ? (
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

  // No changes - show context-aware generation actions
  return (
    <div className="global-action-bar">
      <div className="global-action-bar-content">
        <div className="global-action-bar-status ready">
          <CheckIcon className="w-4 h-4" />
          <span className="global-action-bar-status-text">
            {status === 'audio_ready'
              ? 'Ready to publish'
              : status === 'script_ready'
                ? 'Script ready'
                : status === 'failed'
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
      case 'draft':
        return (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateScript}
              disabled={disabled}
              className="global-action-bar-btn-secondary"
            >
              <PlayIcon className="w-3.5 h-3.5 mr-1.5" />
              Generate Script
            </Button>
            <Button
              size="sm"
              onClick={onGenerateAll}
              disabled={disabled}
              className="global-action-bar-btn-primary"
            >
              <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
              Generate All
            </Button>
          </>
        );

      case 'script_ready':
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="global-action-bar-btn-secondary"
                >
                  <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
                  Regenerate
                  <ChevronDownIcon className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onGenerateScript}>
                  <ReloadIcon className="w-4 h-4 mr-2" />
                  Regenerate Script
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onGenerateAll}>
                  <LightningBoltIcon className="w-4 h-4 mr-2" />
                  Regenerate All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              onClick={onGenerateAudio}
              disabled={disabled}
              className="global-action-bar-btn-primary"
            >
              <PlayIcon className="w-3.5 h-3.5 mr-1.5" />
              Generate Audio
            </Button>
          </>
        );

      case 'audio_ready':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                className="global-action-bar-btn-secondary"
              >
                <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
                Regenerate
                <ChevronDownIcon className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onGenerateScript}>
                <ReloadIcon className="w-4 h-4 mr-2" />
                Regenerate Script
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onGenerateAudio}>
                <ReloadIcon className="w-4 h-4 mr-2" />
                Regenerate Audio
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onGenerateAll}>
                <LightningBoltIcon className="w-4 h-4 mr-2" />
                Regenerate All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );

      case 'failed':
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="global-action-bar-btn-secondary"
                >
                  <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
                  Options
                  <ChevronDownIcon className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onGenerateScript}>
                  <ReloadIcon className="w-4 h-4 mr-2" />
                  Regenerate Script
                </DropdownMenuItem>
                {hasScript && (
                  <DropdownMenuItem onClick={onGenerateAudio}>
                    <ReloadIcon className="w-4 h-4 mr-2" />
                    Regenerate Audio
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              onClick={hasScript ? onGenerateAudio : onGenerateScript}
              disabled={disabled}
              className="global-action-bar-btn-primary"
            >
              <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </>
        );

      default:
        return null;
    }
  }
}
