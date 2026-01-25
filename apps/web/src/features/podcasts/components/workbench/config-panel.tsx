import {
  LightningBoltIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
  FileTextIcon,
} from '@radix-ui/react-icons';
import { useState, useCallback, type MouseEvent } from 'react';
import type { UsePodcastSettingsReturn } from '../../hooks/use-podcast-settings';
import type { UseDocumentSelectionReturn } from '../../hooks/use-document-selection';
import type { RouterOutput } from '@repo/api/client';
import { VersionStatus } from '../../lib/status';
import { AudioPlayer } from '../audio-player';
import { DocumentManager } from './document-manager';
import { ErrorDisplay } from './error-display';
import { GenerationStatus } from './generation-status';
import { PodcastSettings } from './podcast-settings';
import { PromptViewerPanel } from './prompt-viewer';

type PodcastFull = RouterOutput['podcasts']['get'];
type TabId = 'produce' | 'mix';

// Hoisted outside component to avoid recreation on every render (rendering-hoist-jsx)
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'produce', label: 'Generate', icon: <LightningBoltIcon /> },
  { id: 'mix', label: 'Settings', icon: <MixerHorizontalIcon /> },
];

interface ConfigPanelProps {
  podcast: PodcastFull;
  displayAudio: { url: string; duration: number | null } | null;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  settings: UsePodcastSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
}

export function ConfigPanel({
  podcast,
  displayAudio,
  isGenerating,
  isPendingGeneration,
  settings,
  documentSelection,
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('produce');
  const [showPromptViewer, setShowPromptViewer] = useState(false);

  // Stable callback using data-attribute pattern to avoid inline closures in map
  const handleTabClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const tabId = e.currentTarget.dataset.tabId as TabId;
      setActiveTab(tabId);
    },
    [],
  );

  // Functional setState to avoid closure over showPromptViewer
  const handleTogglePromptViewer = useCallback(() => {
    setShowPromptViewer((prev) => !prev);
  }, []);

  // Stable callback for closing prompt viewer
  const handleClosePromptViewer = useCallback(() => {
    setShowPromptViewer(false);
  }, []);

  return (
    <div className="control-room relative">
      {/* Tab Navigation */}
      <nav className="control-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            onClick={handleTabClick}
            className={`control-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            <span className="control-tab-label">{tab.label}</span>
          </button>
        ))}

        {/* Prompt Viewer Toggle */}
        {podcast.generationContext && (
          <button
            onClick={handleTogglePromptViewer}
            className={`history-toggle ${showPromptViewer ? 'active' : ''}`}
            aria-label="View generation details"
            title="View generation details"
          >
            <FileTextIcon />
          </button>
        )}
      </nav>

      {/* Tab Content */}
      <div className="control-room-content">
        {activeTab === 'produce' && (
          <div key="produce" className="control-panel">
            {/* Generation Progress - shown only during generation */}
            {(isPendingGeneration || isGenerating) && (
              <GenerationStatus
                status={podcast.status}
                isSavingSettings={false}
                isPendingGeneration={isPendingGeneration}
              />
            )}

            {/* Audio Player */}
            {displayAudio?.url && (
              <div className="audio-section">
                <div className="audio-section-header">
                  <div className="audio-section-icon">
                    <SpeakerLoudIcon />
                  </div>
                  <span className="audio-section-title">Audio Preview</span>
                </div>
                <AudioPlayer url={displayAudio.url} />
              </div>
            )}

            {/* Error Display */}
            {podcast.status === VersionStatus.FAILED &&
              podcast.errorMessage && (
                <ErrorDisplay message={podcast.errorMessage} />
              )}

            {/* Source Documents */}
            <div className="docs-section">
              <div className="docs-header">
                <h3 className="docs-title">
                  Source Documents
                  <span className="docs-count">
                    {documentSelection.documents.length}
                  </span>
                </h3>
              </div>
              <DocumentManager
                documents={documentSelection.documents}
                onAddDocuments={documentSelection.addDocuments}
                onRemoveDocument={documentSelection.removeDocument}
                disabled={isGenerating}
              />
            </div>
          </div>
        )}

        {activeTab === 'mix' && (
          <div key="mix" className="control-panel">
            <PodcastSettings
              podcast={podcast}
              disabled={isGenerating}
              settings={settings}
            />
          </div>
        )}
      </div>

      {/* Prompt Viewer Slide-out Panel */}
      {showPromptViewer && podcast.generationContext && (
        <PromptViewerPanel
          generationContext={podcast.generationContext}
          onClose={handleClosePromptViewer}
        />
      )}
    </div>
  );
}
