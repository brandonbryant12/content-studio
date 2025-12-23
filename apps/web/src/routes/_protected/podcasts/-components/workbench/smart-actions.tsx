import {
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
import type { PodcastStatus } from '../../-constants/status';
import { GenerationStatus } from './generation-status';

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
        <Button onClick={onSave} disabled={isSaving} className="w-full">
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

  // During generation, show enhanced progress indicator
  const isShowingProgress = pendingAction !== null || isGenerating;

  if (isShowingProgress) {
    return (
      <GenerationStatus
        status={status}
        isSavingSettings={false}
        isPendingGeneration={pendingAction !== null}
      />
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
          <Button
            variant="outline"
            onClick={onGenerateScript}
            className="w-full"
          >
            <ReloadIcon className="w-4 h-4 mr-2" />
            Regenerate Script
          </Button>
        </div>
      );

    case 'ready':
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full">
              <ReloadIcon className="w-4 h-4 mr-2" />
              Regenerate
              <ChevronDownIcon className="w-4 h-4 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
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
        <div className="space-y-2">
          <Button
            onClick={hasScript ? onGenerateAudio : onGenerateScript}
            className="w-full"
          >
            <ReloadIcon className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <ReloadIcon className="w-3.5 h-3.5 mr-1.5" />
                Regenerate
                <ChevronDownIcon className="w-3.5 h-3.5 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
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
        </div>
      );

    default:
      return null;
  }
}
