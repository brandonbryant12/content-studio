import { FileTextIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import type { UseDocumentSelectionReturn } from '../../hooks/use-document-selection';
import type { UsePodcastSettingsReturn } from '../../hooks/use-podcast-settings';
import type { RouterOutput } from '@repo/api/client';
import { VersionStatus } from '../../lib/status';
import { DocumentManager } from './document-manager';
import { ErrorDisplay } from './error-display';
import { GenerationStatus } from './generation-status';
import { PodcastSettings } from './podcast-settings';
import { PromptViewerPanel } from './prompt-viewer';

type PodcastFull = RouterOutput['podcasts']['get'];

interface ConfigPanelProps {
  podcast: PodcastFull;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  settings: UsePodcastSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
}

export function ConfigPanel({
  podcast,
  isGenerating,
  isPendingGeneration,
  settings,
  documentSelection,
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

          {/* Error Display */}
          {podcast.status === VersionStatus.FAILED && podcast.errorMessage && (
            <div className="config-section-v2">
              <ErrorDisplay message={podcast.errorMessage} />
            </div>
          )}

          {/* Source Documents */}
          <div className="config-section-v2">
            <h3 className="config-section-title">
              Source Documents
              <span className="config-section-count">
                {documentSelection.documents.length}
              </span>
            </h3>
            <DocumentManager
              documents={documentSelection.documents}
              onAddDocuments={documentSelection.addDocuments}
              onRemoveDocument={documentSelection.removeDocument}
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
