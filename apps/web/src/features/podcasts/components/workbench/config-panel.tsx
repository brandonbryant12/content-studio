import {
  FileTextIcon,
  LockClosedIcon,
  Pencil2Icon,
  SpeakerLoudIcon,
  TimerIcon,
} from '@radix-ui/react-icons';
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
          {/* Generation Progress */}
          {(isPendingGeneration || isGenerating) && (
            <div className="studio-module generating">
              <div className="studio-module-body">
                <GenerationStatus
                  status={podcast.status}
                  isSavingSettings={false}
                  isPendingGeneration={isPendingGeneration}
                />
              </div>
            </div>
          )}

          {/* Voice Mixer */}
          <div className="studio-module">
            <div className="studio-module-header">
              <div className="studio-module-icon voice">
                <SpeakerLoudIcon aria-hidden="true" />
              </div>
              <span className="studio-module-title">Voice Mixer</span>
              {isGenerating && (
                <span className="mixer-locked-hint">
                  <LockClosedIcon className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>
            <div className="studio-module-body">
              <PodcastSettings
                podcast={podcast}
                disabled={isGenerating}
                settings={settings}
                section="voice"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="studio-module">
            <div className="studio-module-header">
              <div className="studio-module-icon duration">
                <TimerIcon aria-hidden="true" />
              </div>
              <span className="studio-module-title">Duration</span>
            </div>
            <div className="studio-module-body">
              <PodcastSettings
                podcast={podcast}
                disabled={isGenerating}
                settings={settings}
                section="duration"
              />
            </div>
          </div>

          {/* Script Direction */}
          <div className="studio-module">
            <div className="studio-module-header">
              <div className="studio-module-icon direction">
                <Pencil2Icon aria-hidden="true" />
              </div>
              <span className="studio-module-title">Script Direction</span>
            </div>
            <div className="studio-module-body">
              <PodcastSettings
                podcast={podcast}
                disabled={isGenerating}
                settings={settings}
                section="instructions"
              />
            </div>
          </div>

          {/* Source Documents */}
          <div className="studio-module">
            <div className="studio-module-header">
              <div className="studio-module-icon sources">
                <FileTextIcon aria-hidden="true" />
              </div>
              <span className="studio-module-title">Sources</span>
              <span className="studio-module-badge">
                {sourceSelection.sources.length}
              </span>
            </div>
            <div className="studio-module-body">
              <SourceManager
                sources={sourceSelection.sources}
                onAddSources={sourceSelection.addSources}
                onRemoveSource={sourceSelection.removeSource}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Prompt Viewer Toggle */}
          {podcast.generationContext && (
            <button
              type="button"
              onClick={() => setShowPromptViewer((prev) => !prev)}
              className="config-prompt-toggle"
              aria-expanded={showPromptViewer}
            >
              <FileTextIcon className="w-4 h-4" aria-hidden="true" />
              <span>View generation details</span>
            </button>
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
