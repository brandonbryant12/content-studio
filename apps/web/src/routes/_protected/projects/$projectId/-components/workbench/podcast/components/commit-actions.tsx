import {
  EyeOpenIcon,
  RocketIcon,
  PlayIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { PodcastStatus } from '@/routes/_protected/podcasts/-constants/status';

interface CommitActionsProps {
  status?: PodcastStatus;
  isEditMode: boolean;
  isLoading: boolean;
  disabled?: boolean;
  selectedDocumentCount: number;
  loadingStates: {
    generateFull: boolean;
    generateScript: boolean;
    generateAudio: boolean;
    createAndGenerate: boolean;
    createAndPreview: boolean;
  };
  onGenerateFull: () => void;
  onPreviewScript: () => void;
  onGenerateAudio: () => void;
}

export function CommitActions({
  status,
  isEditMode,
  isLoading,
  disabled,
  selectedDocumentCount,
  loadingStates,
  onGenerateFull,
  onPreviewScript,
  onGenerateAudio,
}: CommitActionsProps) {
  const isScriptReady = status === 'script_ready';
  const isReady = status === 'ready';
  const isFailed = status === 'failed';
  const isDraft = status === 'draft';
  const isGenerating = status === 'generating_script' || status === 'generating_audio';

  // Edit mode actions
  if (isEditMode) {
    return (
      <div className="pt-6 space-y-3 border-t border-gray-200 dark:border-gray-800 mt-6">
        {isScriptReady && (
          <>
            <Button
              onClick={onGenerateAudio}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
            >
              {loadingStates.generateAudio ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Generate Audio
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onPreviewScript}
              disabled={isLoading}
              className="w-full"
            >
              <ReloadIcon className="w-4 h-4 mr-2" />
              Regenerate Script
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Review the script in the staging area before generating audio.
            </p>
          </>
        )}

        {isReady && (
          <>
            <Button
              variant="outline"
              onClick={onGenerateFull}
              disabled={isLoading}
              className="w-full"
            >
              {loadingStates.generateFull ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Regenerating...
                </>
              ) : (
                <>
                  <ReloadIcon className="w-4 h-4 mr-2" />
                  Regenerate Podcast
                </>
              )}
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              This will regenerate both script and audio.
            </p>
          </>
        )}

        {(isDraft || isFailed) && (
          <>
            <Button
              onClick={onGenerateFull}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
            >
              {loadingStates.generateFull ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <RocketIcon className="w-4 h-4 mr-2" />
                  {isFailed ? 'Retry Generation' : 'Generate Podcast'}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onPreviewScript}
              disabled={isLoading}
              className="w-full"
            >
              {loadingStates.generateScript ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <EyeOpenIcon className="w-4 h-4 mr-2" />
                  Preview Script First
                </>
              )}
            </Button>
          </>
        )}

        {isGenerating && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generation in progress...
            </p>
          </div>
        )}
      </div>
    );
  }

  // Create mode actions
  return (
    <div className="pt-6 space-y-3 border-t border-gray-200 dark:border-gray-800 mt-6">
      <div className="text-center">
        {selectedDocumentCount === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select documents to continue
          </p>
        ) : (
          <p className="text-sm text-violet-600 dark:text-violet-400">
            {selectedDocumentCount} document
            {selectedDocumentCount > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <Button
        onClick={onGenerateFull}
        disabled={disabled || isLoading}
        className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
      >
        {loadingStates.createAndGenerate || loadingStates.generateFull ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Creating...
          </>
        ) : (
          <>
            <RocketIcon className="w-4 h-4 mr-2" />
            Generate Podcast
          </>
        )}
      </Button>

      <Button
        variant="outline"
        onClick={onPreviewScript}
        disabled={disabled || isLoading}
        className="w-full"
      >
        {loadingStates.createAndPreview || loadingStates.generateScript ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Creating...
          </>
        ) : (
          <>
            <EyeOpenIcon className="w-4 h-4 mr-2" />
            Preview Script First
          </>
        )}
      </Button>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Preview lets you review and edit the script before generating audio.
      </p>
    </div>
  );
}
