// features/voiceovers/components/voiceover-detail.tsx

import type { Collaborator } from '../hooks/use-collaborators';
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

interface Owner {
  id: string;
  name: string;
  image?: string | null;
  hasApproved: boolean;
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
  owner: Owner;
  collaborators: readonly Collaborator[];
  currentUserHasApproved: boolean;
  onManageCollaborators: () => void;
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
  owner,
  collaborators,
  currentUserHasApproved,
  onManageCollaborators,
  onApprove,
  onRevoke,
  isApprovalPending,
}: VoiceoverDetailProps) {
  return (
    <WorkbenchLayout
      voiceover={voiceover}
      onDelete={onDelete}
      isDeleting={isDeleting}
      owner={owner}
      collaborators={collaborators}
      currentUserHasApproved={currentUserHasApproved}
      onManageCollaborators={onManageCollaborators}
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
      <div className="flex flex-col gap-6 p-6">
        {/* Voice Ensemble at top */}
        <VoiceSelector
          voice={settings.voice}
          onChange={settings.setVoice}
          disabled={isGenerating}
        />

        {/* Full-width Manuscript */}
        <div className="flex-1 min-h-[400px]">
          <TextEditor
            text={settings.text}
            onChange={settings.setText}
            disabled={isGenerating}
          />
        </div>

        {/* Audio Stage (when available) */}
        {displayAudio && (
          <AudioStage src={displayAudio.url} duration={displayAudio.duration} />
        )}
      </div>
    </WorkbenchLayout>
  );
}
