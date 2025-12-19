import { ClockIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import type { RouterOutput } from '@repo/api/client';
import { SmartActions } from './smart-actions';
import { ErrorDisplay } from './error-display';
import { VersionHistory } from './version-history';
import { DocumentManager } from './document-manager';
import { PodcastSettings } from './podcast-settings';
import { AudioPlayer } from '../audio-player';

type PodcastFull = RouterOutput['podcasts']['get'];

interface ConfigPanelProps {
  podcast: PodcastFull;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onGenerateScript: () => void;
  onGenerateAudio: () => void;
  onGenerateAll: () => void;
  isGenerating: boolean;
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
        {title}
      </h3>
    </div>
  );
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
}: ConfigPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-5 space-y-6">
        {/* Smart Actions */}
        <section>
          <SmartActions
            status={podcast.status}
            hasScript={!!podcast.script}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
            isGenerating={isGenerating}
            onSave={onSave}
            onGenerateScript={onGenerateScript}
            onGenerateAudio={onGenerateAudio}
            onGenerateAll={onGenerateAll}
          />
        </section>

        {/* Audio Player */}
        {podcast.audioUrl && (
          <section className="pt-2">
            <SectionHeader
              icon={<SpeakerLoudIcon className="w-3.5 h-3.5" />}
              title="Audio"
            />
            <AudioPlayer url={podcast.audioUrl} />
          </section>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200/60 dark:border-gray-800/60" />

        {/* Source Documents */}
        <section>
          <DocumentManager
            podcastId={podcast.id}
            documents={podcast.documents}
            disabled={isGenerating}
          />
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200/60 dark:border-gray-800/60" />

        {/* Podcast Settings */}
        <section>
          <PodcastSettings
            podcast={podcast}
            disabled={isGenerating}
          />
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200/60 dark:border-gray-800/60" />

        {/* Version History */}
        <section>
          <SectionHeader
            icon={<ClockIcon className="w-3.5 h-3.5" />}
            title="Version History"
          />
          <VersionHistory podcastId={podcast.id} />
        </section>

        {/* Error Display */}
        {podcast.status === 'failed' && podcast.errorMessage && (
          <>
            <div className="border-t border-gray-200/60 dark:border-gray-800/60" />
            <ErrorDisplay message={podcast.errorMessage} />
          </>
        )}
      </div>
    </div>
  );
}
