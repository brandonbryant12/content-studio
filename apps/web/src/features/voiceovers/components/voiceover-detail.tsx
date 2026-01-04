// features/voiceovers/components/voiceover-detail.tsx

import type { RouterOutput } from '@repo/api/client';
import type { UseVoiceoverSettingsReturn, Collaborator } from '../hooks';
import {
  WorkbenchLayout,
  TextEditor,
  VoiceSelector,
  ActionBar,
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
  currentUserId: string;
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
  currentUserId,
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
      currentUserId={currentUserId}
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
