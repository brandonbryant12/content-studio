import { LightningBoltIcon, PlayIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { PodcastStatus } from '../../-constants/status';

interface SmartActionsProps {
  status: PodcastStatus;
  hasScript: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isGenerating: boolean;
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
  onSave,
  onGenerateScript,
  onGenerateAudio,
  onGenerateAll,
}: SmartActionsProps) {
  // If unsaved changes, primary action is Save
  if (hasUnsavedChanges) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            Unsaved Changes
          </p>
        </div>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm shadow-amber-500/20"
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
        <p className="text-[11px] text-amber-600/80 dark:text-amber-400/60 text-center mt-2">
          Save before generating new content
        </p>
      </div>
    );
  }

  // During generation, show progress
  if (isGenerating) {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 border border-violet-200/60 dark:border-violet-800/40">
        <div className="flex items-center justify-center gap-3 py-3">
          <div className="relative">
            <Spinner className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <div className="absolute inset-0 animate-ping">
              <div className="w-6 h-6 rounded-full bg-violet-400/30" />
            </div>
          </div>
          <div>
            <p className="font-medium text-violet-900 dark:text-violet-100">
              {status === 'generating_script' ? 'Writing Script...' : 'Creating Audio...'}
            </p>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/60">
              This may take a minute
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Context-aware actions based on status
  switch (status) {
    case 'draft':
      return (
        <div className="space-y-3">
          <Button
            onClick={onGenerateScript}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md shadow-violet-500/25 text-sm font-medium"
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            Generate Script
          </Button>
          <Button
            variant="outline"
            onClick={onGenerateAll}
            className="w-full border-gray-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"
          >
            <LightningBoltIcon className="w-4 h-4 mr-2" />
            Generate All
          </Button>
        </div>
      );

    case 'script_ready':
      return (
        <div className="space-y-3">
          <Button
            onClick={onGenerateAudio}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md shadow-violet-500/25 text-sm font-medium"
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            Generate Audio
          </Button>
          <Button
            variant="outline"
            onClick={onGenerateScript}
            className="w-full border-gray-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"
          >
            <ReloadIcon className="w-4 h-4 mr-2" />
            Regenerate Script
          </Button>
        </div>
      );

    case 'ready':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={onGenerateAudio}
              className="border-gray-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-xs"
            >
              <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
              Audio
            </Button>
            <Button
              variant="outline"
              onClick={onGenerateScript}
              className="border-gray-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-xs"
            >
              <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
              Script
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={onGenerateAll}
            className="w-full text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 text-xs"
          >
            <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
            Regenerate All
          </Button>
        </div>
      );

    case 'failed':
      return (
        <div className="space-y-3">
          <Button
            onClick={hasScript ? onGenerateAudio : onGenerateScript}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md shadow-violet-500/25 text-sm font-medium"
          >
            <ReloadIcon className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={onGenerateScript}
              className="border-gray-300 dark:border-gray-700 text-xs"
            >
              Script
            </Button>
            {hasScript && (
              <Button
                variant="outline"
                onClick={onGenerateAudio}
                className="border-gray-300 dark:border-gray-700 text-xs"
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
