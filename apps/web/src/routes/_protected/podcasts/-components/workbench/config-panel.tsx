import {
  LightningBoltIcon,
  MixerHorizontalIcon,
  ClockIcon,
  SpeakerLoudIcon,
  Cross2Icon,
  FileTextIcon,
  EyeOpenIcon,
} from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { AudioPlayer } from '../audio-player';
import { DocumentManager } from './document-manager';
import { ErrorDisplay } from './error-display';
import { PodcastSettings } from './podcast-settings';
import { PromptViewerPanel } from './prompt-viewer';
import { SmartActions } from './smart-actions';
import { VersionHistory } from './version-history';
import { apiClient } from '@/clients/apiClient';
import { BaseDialog } from '@/components/base-dialog';

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
  selectedScriptId?: string;
  onSelectVersion: (scriptId: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isViewingHistory: boolean;
  viewingVersion?: number;
  onSetAsCurrent: () => void;
  isRestoring: boolean;
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
  selectedScriptId,
  onSelectVersion,
  onRegenerate,
  isRegenerating,
  isViewingHistory,
  viewingVersion,
  onSetAsCurrent,
  isRestoring,
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('produce');
  const [showHistory, setShowHistory] = useState(false);
  const [showPromptViewer, setShowPromptViewer] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Handler for when user tries to interact with settings while viewing history
  const handleReadOnlyInteraction = () => {
    if (isViewingHistory) {
      setShowRestoreDialog(true);
    }
  };

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
        {/* Read-only overlay when viewing historical version */}
        {isViewingHistory && (
          <div
            className="config-panel-readonly-overlay"
            onClick={handleReadOnlyInteraction}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleReadOnlyInteraction()}
          >
            <div className="config-panel-readonly-badge">
              <EyeOpenIcon className="w-4 h-4" />
              <span>Viewing v{viewingVersion}</span>
            </div>
          </div>
        )}

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
                disabled={isGenerating || isViewingHistory}
              />
            </div>
          </div>
        )}

        {activeTab === 'mix' && (
          <div key="mix" className="control-panel">
            <PodcastSettings
              podcast={podcast}
              disabled={isGenerating || isViewingHistory}
              onRegenerate={onRegenerate}
              isRegenerating={isRegenerating}
            />
          </div>
        )}
      </div>

      {/* Restore Version Dialog */}
      <BaseDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title="Viewing Older Version"
        description={`You're currently viewing version ${viewingVersion}. To make changes, you need to restore this version first.`}
        maxWidth="sm"
        footer={{
          submitText: 'Set as Current',
          loadingText: 'Restoring...',
          onSubmit: () => {
            setShowRestoreDialog(false);
            onSetAsCurrent();
          },
          isLoading: isRestoring,
        }}
      >
        <p className="text-sm text-muted-foreground">
          Restoring will create a new version based on this one, making it the
          current version that you can edit.
        </p>
      </BaseDialog>

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
              <VersionHistory
                podcastId={podcast.id}
                selectedScriptId={selectedScriptId}
                onSelectVersion={onSelectVersion}
              />
            </div>
          </div>
        </div>
      )}

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
