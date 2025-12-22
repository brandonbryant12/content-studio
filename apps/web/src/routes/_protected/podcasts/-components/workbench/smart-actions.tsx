import { LightningBoltIcon, PlayIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { PodcastStatus } from '../../-constants/status';

type PendingAction = 'script' | 'audio' | 'all' | null;

interface SmartActionsProps {
  status: PodcastStatus;
  hasScript: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  pendingAction: PendingAction;
  onSave: () => void;
  onGenerateScript: () => void;
  onGenerateAudio: () => void;
  onGenerateAll: () => void;
}

export function SmartActions({
  status,
  hasScript,
  hasUnsavedChanges,
  isSaving,
  isGenerating,
  pendingAction,
  onSave,
  onGenerateScript,
  onGenerateAudio,
  onGenerateAll,
}: SmartActionsProps) {
  // If unsaved changes, show save prompt
  if (hasUnsavedChanges) {
    return (
      <div className="smart-actions">
        <div className="smart-actions-unsaved">
          <div className="smart-actions-unsaved-dot" />
          <span className="smart-actions-unsaved-text">Unsaved changes</span>
        </div>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    );
  }

  // During generation, show progress
  const isShowingProgress = pendingAction !== null || isGenerating;

  if (isShowingProgress) {
    const generatingScript =
      pendingAction === 'script' ||
      pendingAction === 'all' ||
      status === 'generating_script';
    const generatingAudio =
      pendingAction === 'audio' ||
      (status === 'generating_audio' && pendingAction === null);

    const progressMessage = generatingScript
      ? 'Writing script...'
      : generatingAudio
        ? 'Creating audio...'
        : 'Starting...';

    return (
      <div className="smart-actions-progress">
        <Spinner className="smart-actions-progress-spinner" />
        <div>
          <p className="smart-actions-progress-title">{progressMessage}</p>
          <p className="smart-actions-progress-subtitle">This may take a minute</p>
        </div>
      </div>
    );
  }

  // Context-aware actions based on status
  switch (status) {
    case 'draft':
      return (
        <div className="space-y-2">
          <Button onClick={onGenerateScript} className="w-full">
            <PlayIcon className="w-4 h-4 mr-2" />
            Generate Script
          </Button>
          <Button variant="outline" onClick={onGenerateAll} className="w-full">
            <LightningBoltIcon className="w-4 h-4 mr-2" />
            Generate All
          </Button>
        </div>
      );

    case 'script_ready':
      return (
        <div className="space-y-2">
          <Button onClick={onGenerateAudio} className="w-full">
            <PlayIcon className="w-4 h-4 mr-2" />
            Generate Audio
          </Button>
          <Button variant="outline" onClick={onGenerateScript} className="w-full">
            <ReloadIcon className="w-4 h-4 mr-2" />
            Regenerate Script
          </Button>
        </div>
      );

    case 'ready':
      return (
        <div className="space-y-2">
          <p className="smart-actions-label">Regenerate</p>
          <div className="smart-actions-row">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateScript}
              className="flex-1"
            >
              <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
              Script
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateAudio}
              className="flex-1"
            >
              <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
              Audio
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateAll}
              aria-label="Regenerate all"
            >
              <LightningBoltIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      );

    case 'failed':
      return (
        <div className="space-y-2">
          <Button onClick={hasScript ? onGenerateAudio : onGenerateScript} className="w-full">
            <ReloadIcon className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <div className="smart-actions-row">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateScript}
              className="flex-1"
            >
              Script
            </Button>
            {hasScript && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateAudio}
                className="flex-1"
              >
                Audio
              </Button>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}
