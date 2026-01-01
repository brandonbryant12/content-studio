import {
  LightningBoltIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
  FileTextIcon,
} from '@radix-ui/react-icons';
import { useState } from 'react';
import type { UsePodcastSettingsReturn } from '@/hooks';
import type { RouterOutput } from '@repo/api/client';
import { AudioPlayer } from '../audio-player';
import { DocumentManager } from './document-manager';
import { ErrorDisplay } from './error-display';
import { GenerationStatus } from './generation-status';
import { PodcastSettings } from './podcast-settings';
import { PromptViewerPanel } from './prompt-viewer';

type PodcastFull = RouterOutput['podcasts']['get'];
type TabId = 'produce' | 'mix';

interface ConfigPanelProps {
  podcast: PodcastFull;
  displayAudio: { url: string; duration: number | null } | null;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  settings: UsePodcastSettingsReturn;
}

export function ConfigPanel({
  podcast,
  displayAudio,
  isGenerating,
  isPendingGeneration,
  settings,
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('produce');
  const [showPromptViewer, setShowPromptViewer] = useState(false);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'produce', label: 'Generate', icon: <LightningBoltIcon /> },
    { id: 'mix', label: 'Settings', icon: <MixerHorizontalIcon /> },
  ];

  return (
    <div className="control-room relative">
      {/* Tab Navigation */}
      <nav className="control-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`control-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            <span className="control-tab-label">{tab.label}</span>
          </button>
        ))}

        {/* Prompt Viewer Toggle */}
        {podcast.generationContext && (
          <button
            onClick={() => setShowPromptViewer(!showPromptViewer)}
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
                status={podcast.activeVersion?.status}
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
            {podcast.activeVersion?.status === 'failed' && podcast.activeVersion?.errorMessage && (
              <ErrorDisplay message={podcast.activeVersion.errorMessage} />
            )}

            {/* Source Documents */}
            <div className="docs-section">
              <div className="docs-header">
                <h3 className="docs-title">
                  Source Documents
                  <span className="docs-count">{podcast.documents.length}</span>
                </h3>
              </div>
              <DocumentManager
                podcastId={podcast.id}
                documents={[...podcast.documents]}
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
          onClose={() => setShowPromptViewer(false)}
        />
      )}
    </div>
  );
}
