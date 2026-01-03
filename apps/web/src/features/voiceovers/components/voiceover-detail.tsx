// features/voiceovers/components/voiceover-detail.tsx

import type { RouterOutput } from '@repo/api/client';
import type { UseVoiceoverSettingsReturn } from '../hooks';
import { WorkbenchLayout, TextEditor, VoiceSelector } from './workbench';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';

type Voiceover = RouterOutput['voiceovers']['get'];

interface DisplayAudio {
  url: string;
  duration: number | null;
}

export interface VoiceoverDetailProps {
  voiceover: Voiceover;
  settings: UseVoiceoverSettingsReturn;
  displayAudio: DisplayAudio | null;
  hasChanges: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: () => void;
  onDelete: () => void;
  currentUserId: string;
}

export function VoiceoverDetail({
  voiceover,
  settings,
  displayAudio,
  hasChanges,
  isGenerating,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
  currentUserId,
}: VoiceoverDetailProps) {
  return (
    <WorkbenchLayout
      voiceover={voiceover}
      onDelete={onDelete}
      isDeleting={isDeleting}
      currentUserId={currentUserId}
      actionBar={
        <div className="workbench-action-bar">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={settings.discardChanges}
              disabled={!hasChanges || isSaving || isGenerating}
            >
              Discard
            </Button>
            <Button
              onClick={onSave}
              disabled={!hasChanges || isSaving || isGenerating}
            >
              {isSaving ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left: Text editor (takes 2/3) */}
        <div className="lg:col-span-2 flex flex-col min-h-[400px]">
          <TextEditor
            text={settings.text}
            onChange={settings.setText}
            disabled={isGenerating}
            placeholder="Enter your voiceover text here..."
          />
        </div>

        {/* Right: Voice selector and audio preview (takes 1/3) */}
        <div className="flex flex-col gap-6">
          <VoiceSelector
            voice={settings.voice}
            onChange={settings.setVoice}
            disabled={isGenerating}
          />

          {/* Audio player (if available) */}
          {displayAudio && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium mb-3">Audio Preview</h3>
              <audio src={displayAudio.url} controls className="w-full" />
            </div>
          )}
        </div>
      </div>
    </WorkbenchLayout>
  );
}
