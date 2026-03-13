import { FileTextIcon, LockClosedIcon } from '@radix-ui/react-icons';
import { useState, type ReactNode } from 'react';
import type { UsePodcastSettingsReturn } from '../../hooks/use-podcast-settings';
import type { UseSourceSelectionReturn } from '../../hooks/use-source-selection';
import type { RouterOutput } from '@repo/api/client';
import {
  getConfigSectionDefinition,
  type ConfigSection,
} from './config-sections';
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

function SectionPanel({
  title,
  description,
  icon,
  iconVariant,
  badge,
  isGenerating,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconVariant: string;
  badge?: ReactNode;
  isGenerating: boolean;
  children: ReactNode;
}) {
  return (
    <div className="studio-module">
      <div className="studio-module-header">
        <div className={`studio-module-icon ${iconVariant}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="studio-module-title">{title}</span>
            {badge}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {isGenerating && (
          <span className="mixer-locked-hint">
            <LockClosedIcon className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
      <div className="studio-module-body">{children}</div>
    </div>
  );
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
  const definition = getConfigSectionDefinition(section);
  const Icon = definition.Icon;

  return (
    <div className="config-panel-v2">
      <div className="config-panel-v2-scroll">
        <div className="config-panel-v2-inner">
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

          <SectionPanel
            title={definition.title}
            description={definition.description}
            icon={<Icon aria-hidden={true} />}
            iconVariant={definition.iconVariant}
            badge={
              section === 'sources' ? (
                <span className="studio-module-badge">
                  {sourceSelection.sources.length}
                </span>
              ) : undefined
            }
            isGenerating={isGenerating}
          >
            {renderSectionContent({
              section,
              podcast,
              settings,
              sourceSelection,
              isGenerating,
            })}
          </SectionPanel>

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
