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
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span className="text-xs font-medium">Unsaved changes</span>
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
      <div className="flex items-center gap-3 p-4 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
        <Spinner className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        <div>
          <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
            {progressMessage}
          </p>
          <p className="text-xs text-violet-600/70 dark:text-violet-400/60">
            This may take a minute
          </p>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Regenerate
          </p>
          <div className="flex gap-2">
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
          <div className="flex gap-2">
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
