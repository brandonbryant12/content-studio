import {
  LightningBoltIcon,
  MixerHorizontalIcon,
  ClockIcon,
  SpeakerLoudIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { AudioPlayer } from '../audio-player';
import { DocumentManager } from './document-manager';
import { ErrorDisplay } from './error-display';
import { PodcastSettings } from './podcast-settings';
import { SmartActions } from './smart-actions';
import { VersionHistory } from './version-history';
import { apiClient } from '@/clients/apiClient';

type PodcastFull = RouterOutput['podcasts']['get'];
type PendingAction = 'script' | 'audio' | 'all' | null;
type TabId = 'produce' | 'mix';

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
  const [activeTab, setActiveTab] = useState<TabId>('produce');
  const [showHistory, setShowHistory] = useState(false);

  // Fetch version count for the badge
  const { data: versions } = useQuery(
    apiClient.podcasts.listScriptVersions.queryOptions({
      input: { id: podcast.id },
    }),
  );

  const versionCount = versions?.length ?? 0;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'produce', label: 'Produce', icon: <LightningBoltIcon /> },
    { id: 'mix', label: 'Mix', icon: <MixerHorizontalIcon /> },
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

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`history-toggle ${showHistory ? 'active' : ''}`}
          aria-label="Toggle version history"
        >
          <ClockIcon />
          {versionCount > 0 && (
            <span className="history-toggle-count">{versionCount}</span>
          )}
        </button>
      </nav>

      {/* Tab Content */}
      <div className="control-room-content">
        {activeTab === 'produce' && (
          <div key="produce" className="control-panel">
            {/* Smart Actions - Always at top */}
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

            {/* Audio Player */}
            {podcast.audioUrl && (
              <div className="audio-section">
                <div className="audio-section-header">
                  <div className="audio-section-icon">
                    <SpeakerLoudIcon />
                  </div>
                  <span className="audio-section-title">Audio Preview</span>
                </div>
                <AudioPlayer url={podcast.audioUrl} />
              </div>
            )}

            {/* Error Display */}
            {podcast.status === 'failed' && podcast.errorMessage && (
              <ErrorDisplay message={podcast.errorMessage} />
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
                documents={podcast.documents}
                disabled={isGenerating}
              />
            </div>
          </div>
        )}

        {activeTab === 'mix' && (
          <div key="mix" className="control-panel">
            <PodcastSettings podcast={podcast} disabled={isGenerating} />
          </div>
        )}
      </div>

      {/* History Slide-out Panel */}
      {showHistory && (
        <div className="history-panel-overlay">
          <div
            className="history-panel-backdrop"
            onClick={() => setShowHistory(false)}
          />
          <div className="history-panel">
            <div className="history-panel-header">
              <h3 className="history-panel-title">Version History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="history-panel-close"
                aria-label="Close history"
              >
                <Cross2Icon />
              </button>
            </div>
            <div className="history-panel-content">
              <VersionHistory podcastId={podcast.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
