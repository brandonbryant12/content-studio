import type { UseVoiceoverSettingsReturn } from '../hooks/use-voiceover-settings';
import type { RouterOutput } from '@repo/api/client';
import {
  WorkbenchLayout,
  TextEditor,
  VoiceSelector,
  ActionBar,
  AudioStage,
} from './workbench';

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
  hasText: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onGenerate: () => void;
  onDelete: () => void;
  isApproved: boolean;
  isAdmin: boolean;
  // Approval callbacks
  onApprove: () => void;
  onRevoke: () => void;
  isApprovalPending: boolean;
}

export function VoiceoverDetail({
  voiceover,
  settings,
  displayAudio,
  hasChanges,
  hasText,
  isGenerating,
  isSaving,
  isDeleting,
  onGenerate,
  onDelete,
  isApproved,
  isAdmin,
  onApprove,
  onRevoke,
  isApprovalPending,
}: VoiceoverDetailProps) {
  return (
    <WorkbenchLayout
      voiceover={voiceover}
      onDelete={onDelete}
      isDeleting={isDeleting}
      isApproved={isApproved}
      isAdmin={isAdmin}
      onApprove={onApprove}
      onRevoke={onRevoke}
      isApprovalPending={isApprovalPending}
      actionBar={
        <ActionBar
          status={voiceover.status}
          isGenerating={isGenerating}
          hasChanges={hasChanges}
          hasText={hasText}
          isSaving={isSaving}
          onGenerate={onGenerate}
        />
      }
    >
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 h-full">
        {/* Voice Ensemble at top - pinned */}
        <div className="shrink-0">
          <VoiceSelector
            voice={settings.voice}
            onChange={settings.setVoice}
            disabled={isGenerating}
          />
        </div>

        {/* Full-width Manuscript - fills remaining space, scrolls internally */}
        <div className="flex-1 min-h-0">
          <TextEditor
            text={settings.text}
            onChange={settings.setText}
            disabled={isGenerating}
          />
        </div>

        {/* Audio Stage (when available) - pinned at bottom */}
        {displayAudio && (
          <div className="shrink-0">
            <AudioStage
              src={displayAudio.url}
              duration={displayAudio.duration}
            />
          </div>
        )}
      </div>
    </WorkbenchLayout>
  );
}
