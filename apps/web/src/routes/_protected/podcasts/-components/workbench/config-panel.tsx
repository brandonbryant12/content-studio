import { ClockIcon, GearIcon, SpeakerLoudIcon, FileTextIcon } from '@radix-ui/react-icons';
import type { RouterOutput } from '@repo/api/client';
import { SmartActions } from './smart-actions';
import { ErrorDisplay } from './error-display';
import { VersionHistory } from './version-history';
import { DocumentManager } from './document-manager';
import { PodcastSettings } from './podcast-settings';
import { AudioPlayer } from '../audio-player';
import { CollapsibleSection } from './collapsible-section';

type PodcastFull = RouterOutput['podcasts']['get'];
type PendingAction = 'script' | 'audio' | 'all' | null;

interface ConfigPanelProps {
  podcast: PodcastFull;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onGenerateScript: () => void;
  onGenerateAudio: () => void;
  onGenerateAll: () => void;
  isGenerating: boolean;
  pendingAction: PendingAction;
}

export function ConfigPanel({
  podcast,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onGenerateScript,
  onGenerateAudio,
  onGenerateAll,
  isGenerating,
  pendingAction,
}: ConfigPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Primary Actions - Always visible */}
        <section>
          <SmartActions
            status={podcast.status}
            hasScript={!!podcast.script}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
            isGenerating={isGenerating}
            pendingAction={pendingAction}
            onSave={onSave}
            onGenerateScript={onGenerateScript}
            onGenerateAudio={onGenerateAudio}
            onGenerateAll={onGenerateAll}
          />
        </section>

        {/* Audio Player - Prominent when available */}
        {podcast.audioUrl && (
          <section className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <SpeakerLoudIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Audio
              </span>
            </div>
            <AudioPlayer url={podcast.audioUrl} />
          </section>
        )}

        {/* Error Display */}
        {podcast.status === 'failed' && podcast.errorMessage && (
          <ErrorDisplay message={podcast.errorMessage} />
        )}

        {/* Divider */}
        <hr className="border-gray-200 dark:border-gray-800" />

        {/* Source Documents - Collapsible */}
        <CollapsibleSection
          icon={<FileTextIcon className="w-3.5 h-3.5" />}
          title="Source Documents"
          badge={
            <span className="ml-1.5 text-xs text-gray-400 tabular-nums">
              {podcast.documents.length}
            </span>
          }
          defaultOpen={true}
        >
          <DocumentManager
            podcastId={podcast.id}
            documents={podcast.documents}
            disabled={isGenerating}
          />
        </CollapsibleSection>

        {/* Settings - Collapsible */}
        <CollapsibleSection
          icon={<GearIcon className="w-3.5 h-3.5" />}
          title="Settings"
          defaultOpen={false}
        >
          <PodcastSettings podcast={podcast} disabled={isGenerating} />
        </CollapsibleSection>

        {/* Version History - Collapsible */}
        <CollapsibleSection
          icon={<ClockIcon className="w-3.5 h-3.5" />}
          title="Version History"
          defaultOpen={false}
        >
          <VersionHistory podcastId={podcast.id} />
        </CollapsibleSection>
      </div>
    </div>
  );
}
