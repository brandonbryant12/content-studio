import { FileTextIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
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
  isGenerating: boolean;
  isPendingGeneration: boolean;
  settings: UsePodcastSettingsReturn;
  sourceSelection: UseSourceSelectionReturn;
}

export function ConfigPanel({
  podcast,
  isGenerating,
  isPendingGeneration,
  settings,
  sourceSelection,
}: ConfigPanelProps) {
  const [showPromptViewer, setShowPromptViewer] = useState(false);

  return (
    <div className="config-panel-v2">
      {/* Full-width scroll container */}
      <div className="config-panel-v2-scroll">
        <div className="config-panel-v2-inner">
          {/* Generation Progress - shown only during generation */}
          {(isPendingGeneration || isGenerating) && (
            <div className="config-section-v2">
              <GenerationStatus
                status={podcast.status}
                isSavingSettings={false}
                isPendingGeneration={isPendingGeneration}
              />
            </div>
          )}

          {/* Source Documents */}
          <div className="config-section-v2">
            <h3 className="config-section-title">
              Source Documents
              <span className="config-section-count">
                {sourceSelection.sources.length}
              </span>
            </h3>
            <SourceManager
              sources={sourceSelection.sources}
              onAddSources={sourceSelection.addSources}
              onRemoveSource={sourceSelection.removeSource}
              disabled={isGenerating}
            />
          </div>

          {/* Podcast Settings */}
          <div className="config-section-v2">
            <h3 className="config-section-title">Voice & Format</h3>
            <PodcastSettings
              podcast={podcast}
              disabled={isGenerating}
              settings={settings}
            />
          </div>

          {/* Prompt Viewer Toggle */}
          {podcast.generationContext && (
            <div className="config-section-v2">
              <button
                type="button"
                onClick={() => setShowPromptViewer((prev) => !prev)}
                className="config-prompt-toggle"
                aria-expanded={showPromptViewer}
              >
                <FileTextIcon className="w-4 h-4" aria-hidden="true" />
                <span>View generation details</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Viewer Slide-out Panel */}
      {showPromptViewer && podcast.generationContext && (
        <PromptViewerPanel
          generationContext={podcast.generationContext}
          onClose={() => setShowPromptViewer(false)}
        />
      )}
    </div>
  );
}
