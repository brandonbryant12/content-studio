import { LightningBoltIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { VersionStatus } from '../../-constants/status';
import { GenerationStatus } from './generation-status';

interface SmartActionsProps {
  status: VersionStatus | undefined;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  onSave: () => void;
  onGenerate: () => void;
}

export function SmartActions({
  status,
  hasUnsavedChanges,
  isSaving,
  isGenerating,
  onSave,
  onGenerate,
}: SmartActionsProps) {
  // During generation, show progress indicator
  if (isGenerating) {
    return (
      <GenerationStatus
        status={status}
        isSavingSettings={false}
        isPendingGeneration={false}
      />
    );
  }

  // If unsaved changes (only possible when status is 'ready'), show save button
  if (hasUnsavedChanges && status === 'ready') {
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
            'Save & Regenerate Audio'
          )}
        </Button>
      </div>
    );
  }

  // Context-aware actions based on status
  switch (status) {
    case 'drafting':
      return (
        <Button onClick={onGenerate} className="w-full">
          <LightningBoltIcon className="w-4 h-4 mr-2" />
          Generate Podcast
        </Button>
      );

    case 'ready':
      return (
        <Button variant="outline" onClick={onGenerate} className="w-full">
          <ReloadIcon className="w-4 h-4 mr-2" />
          Regenerate Podcast
        </Button>
      );

    case 'failed':
      return (
        <Button onClick={onGenerate} className="w-full">
          <ReloadIcon className="w-4 h-4 mr-2" />
          Retry
        </Button>
      );

    // script_ready, generating_script, generating_audio - show progress
    case 'script_ready':
    case 'generating_script':
    case 'generating_audio':
      return (
        <GenerationStatus
          status={status}
          isSavingSettings={false}
          isPendingGeneration={false}
        />
      );

    default:
      return null;
  }
}
