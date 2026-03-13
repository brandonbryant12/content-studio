import { FileTextIcon } from '@radix-ui/react-icons';
import { VersionStatus } from '@repo/api/contracts';
import type { UsePodcastSettingsReturn } from '../hooks/use-podcast-settings';
import type { UseScriptEditorReturn } from '../hooks/use-script-editor';
import type { UseSourceSelectionReturn } from '../hooks/use-source-selection';
import type { RouterOutput } from '@repo/api/client';
import {
  WorkbenchLayout,
  ScriptPanel,
  ConfigPanel,
  GlobalActionBar,
} from './workbench';
import { configSectionDefinitions } from './workbench/config-sections';
import { AudioStage } from '@/shared/components/audio-stage';

type Podcast = RouterOutput['podcasts']['get'];

interface DisplayAudio {
  url: string;
  duration: number | null;
}

interface PodcastWorkbenchState {
  hasChanges: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

interface PodcastApprovalState {
  isApproved: boolean;
  isAdmin: boolean;
  isApprovalPending: boolean;
}

interface PodcastDetailProps {
  podcast: Podcast;
  userId?: string;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  sourceSelection: UseSourceSelectionReturn;
  displayAudio: DisplayAudio | null;
  workbenchState: PodcastWorkbenchState;
  approvalState: PodcastApprovalState;
  onSave: () => void;
  onGenerate: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onRevoke: () => void;
  canExportAudio?: boolean;
  canExportScript?: boolean;
  onExportAudio?: () => void;
  onExportScript?: () => void;
  onCopyTranscript?: () => void;
}

export function PodcastDetail({
  podcast,
  userId,
  scriptEditor,
  settings,
  sourceSelection,
  displayAudio,
  workbenchState,
  approvalState,
  onSave,
  onGenerate,
  onDelete,
  onApprove,
  onRevoke,
  canExportAudio = false,
  canExportScript = false,
  onExportAudio,
  onExportScript,
  onCopyTranscript,
}: PodcastDetailProps) {
  const {
    hasChanges,
    isGenerating,
    isPendingGeneration,
    isSaving,
    isDeleting,
  } = workbenchState;
  const { isApproved, isAdmin, isApprovalPending } = approvalState;
  const tabs = [
    {
      value: 'script',
      label: 'Script',
      icon: <FileTextIcon className="w-4 h-4" />,
      content: (
        <ScriptPanel
          segments={scriptEditor.segments}
          summary={podcast.summary ?? null}
          hasChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          disabled={podcast.status !== VersionStatus.READY}
          onUpdateSegment={scriptEditor.updateSegment}
          onRemoveSegment={scriptEditor.removeSegment}
          onAddSegment={scriptEditor.addSegment}
          onDiscard={scriptEditor.discardChanges}
        />
      ),
    },
    ...configSectionDefinitions.map((section) => ({
      value: section.value,
      label: section.label,
      icon: <section.Icon className="w-4 h-4" />,
      content: (
        <ConfigPanel
          podcast={podcast}
          userId={userId}
          section={section.value}
          isGenerating={isGenerating}
          isPendingGeneration={isPendingGeneration}
          settings={settings}
          sourceSelection={sourceSelection}
        />
      ),
    })),
  ] as const;

  return (
    <WorkbenchLayout
      podcast={podcast}
      tabs={tabs}
      onDelete={onDelete}
      isDeleting={isDeleting}
      isApproved={isApproved}
      isAdmin={isAdmin}
      onApprove={onApprove}
      onRevoke={onRevoke}
      isApprovalPending={isApprovalPending}
      canExportAudio={canExportAudio}
      canExportScript={canExportScript}
      onExportAudio={onExportAudio}
      onExportScript={onExportScript}
      onCopyTranscript={onCopyTranscript}
      audioStrip={
        displayAudio ? (
          <AudioStage src={displayAudio.url} duration={displayAudio.duration} />
        ) : null
      }
      actionBar={
        <GlobalActionBar
          status={podcast.status}
          isGenerating={isGenerating}
          hasChanges={hasChanges}
          isSaving={isSaving}
          onSave={onSave}
          onGenerate={onGenerate}
          disabled={isGenerating}
          errorMessage={podcast.errorMessage}
        />
      }
    />
  );
}
