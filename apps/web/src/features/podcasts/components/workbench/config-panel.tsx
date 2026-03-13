import { FileTextIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import type { ConfigSection } from './config-sections';
import type { UsePodcastSettingsReturn } from '../../hooks/use-podcast-settings';
import type { UseSourceSelectionReturn } from '../../hooks/use-source-selection';
import type { RouterOutput } from '@repo/api/client';
import { GenerationStatus } from './generation-status';
import { PodcastSettings } from './podcast-settings';
import { PromptViewerPanel } from './prompt-viewer';
import { SourceManager } from './source-manager';

type PodcastFull = RouterOutput['podcasts']['get'];

interface ConfigPanelProps {
  podcast: PodcastFull;
  userId?: string;
  section: ConfigSection;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  settings: UsePodcastSettingsReturn;
  sourceSelection: UseSourceSelectionReturn;
}

function renderSectionContent({
  section,
  podcast,
  settings,
  sourceSelection,
  isGenerating,
}: Omit<ConfigPanelProps, 'userId' | 'isPendingGeneration'>) {
  switch (section) {
    case 'voice':
    case 'instructions':
      return (
        <PodcastSettings
          podcast={podcast}
          disabled={isGenerating}
          settings={settings}
          section={section}
        />
      );
    case 'sources':
      return (
        <SourceManager
          sources={sourceSelection.sources}
          onRemoveSource={sourceSelection.removeSource}
          disabled={isGenerating}
        />
      );
  }
}

export function ConfigPanel({
  podcast,
  userId,
  section,
  isGenerating,
  isPendingGeneration,
  settings,
  sourceSelection,
}: ConfigPanelProps) {
  const [showPromptViewer, setShowPromptViewer] = useState(false);

  return (
    <div className="config-panel-v2">
      <div className="config-panel-v2-scroll">
        <div className="config-panel-v2-inner">
          {(isPendingGeneration || isGenerating) && (
            <GenerationStatus
              status={podcast.status}
              isSavingSettings={false}
              isPendingGeneration={isPendingGeneration}
            />
          )}

          {renderSectionContent({
            section,
            podcast,
            settings,
            sourceSelection,
            isGenerating,
          })}

          {podcast.generationContext && (
            <button
              type="button"
              onClick={() => setShowPromptViewer((prev) => !prev)}
              className="config-prompt-toggle"
              aria-expanded={showPromptViewer}
            >
              <FileTextIcon className="h-4 w-4" aria-hidden="true" />
              <span>View generation details</span>
            </button>
          )}
        </div>
      </div>

      {showPromptViewer && podcast.generationContext && (
        <PromptViewerPanel
          generationContext={podcast.generationContext}
          userId={userId}
          onClose={() => setShowPromptViewer(false)}
        />
      )}
    </div>
  );
}
