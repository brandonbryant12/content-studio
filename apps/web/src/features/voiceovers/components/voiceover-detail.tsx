import { FileTextIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useState, type ReactNode } from 'react';
import type { UseVoiceoverSettingsReturn } from '../hooks/use-voiceover-settings';
import type { RouterOutput } from '@repo/api/client';
import { isQuickStartVisible } from '../lib/status';
import {
  WorkbenchLayout,
  TextEditor,
  VoiceSelector,
  ActionBar,
  AudioStage,
  QuickStartGuide,
} from './workbench';
import { getGenerationFailureMessage } from '@/shared/lib/errors';

type Voiceover = RouterOutput['voiceovers']['get'];

interface DisplayAudio {
  url: string;
  duration: number | null;
}

export interface VoiceoverWorkbenchState {
  hasChanges: boolean;
  hasText: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

export interface VoiceoverApprovalState {
  isApproved: boolean;
  isAdmin: boolean;
  isApprovalPending: boolean;
}

export interface VoiceoverDetailProps {
  voiceover: Voiceover;
  settings: UseVoiceoverSettingsReturn;
  displayAudio: DisplayAudio | null;
  assistantPanel?: ReactNode;
  workbenchState: VoiceoverWorkbenchState;
  approvalState: VoiceoverApprovalState;
  onGenerate: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onRevoke: () => void;
  canExportAudio?: boolean;
  canExportScript?: boolean;
  onExportAudio?: () => void;
  onExportScript?: () => void;
  onCopyTranscript?: () => void;
}

export function VoiceoverDetail({
  voiceover,
  settings,
  displayAudio,
  assistantPanel,
  workbenchState,
  approvalState,
  onGenerate,
  onDelete,
  onApprove,
  onRevoke,
  canExportAudio = false,
  canExportScript = false,
  onExportAudio,
  onExportScript,
  onCopyTranscript,
}: VoiceoverDetailProps) {
  const { hasChanges, hasText, isGenerating, isSaving, isDeleting } =
    workbenchState;
  const { isApproved, isAdmin, isApprovalPending } = approvalState;

  const [quickStartDismissed, setQuickStartDismissed] = useState(false);
  const showQuickStart =
    !quickStartDismissed &&
    isQuickStartVisible(voiceover) &&
    settings.text.length === 0;
  const failureMessage =
    voiceover.status === 'failed'
      ? (getGenerationFailureMessage(voiceover.errorMessage) ??
        'Generation failed. Please retry.')
      : null;
  const failureHint =
    failureMessage?.includes('Too many requests') ||
    failureMessage?.includes('temporarily unavailable')
      ? 'This looks temporary. Wait a moment, then retry generation.'
      : hasText
        ? 'Review the script and selected voice, then retry generation from the main action area.'
        : 'Add or revise the script before retrying generation.';

  const failureAlert =
    voiceover.status === 'failed' && failureMessage ? (
      <section
        className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4"
        role="alert"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Audio generation did not complete
            </p>
            <p className="mt-1 text-sm text-foreground">{failureMessage}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {failureHint}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating || isSaving}
            className="shrink-0"
          >
            {hasChanges ? 'Save changes & retry' : 'Retry generation'}
          </Button>
        </div>
      </section>
    ) : null;

  const tabs = [
    {
      value: 'script',
      label: 'Script',
      icon: <FileTextIcon className="w-4 h-4" />,
      content: (
        <div className="flex h-full flex-col gap-4 px-4 pt-4 pb-4 sm:px-6 lg:px-8">
          {failureAlert}
          <div className="flex-1 min-h-0">
            {showQuickStart ? (
              <QuickStartGuide
                onStartWriting={() => setQuickStartDismissed(true)}
                onDismiss={() => setQuickStartDismissed(true)}
              />
            ) : (
              <TextEditor
                text={settings.text}
                onChange={settings.setText}
                disabled={isGenerating}
                autoFocus={quickStartDismissed}
              />
            )}
          </div>
        </div>
      ),
    },
    {
      value: 'voice',
      label: 'Voice',
      icon: <SpeakerLoudIcon className="w-4 h-4" />,
      content: (
        <div className="px-4 pt-4 pb-6 sm:px-6 lg:px-8">
          <VoiceSelector
            voice={settings.voice}
            onChange={settings.setVoice}
            disabled={isGenerating}
          />
        </div>
      ),
    },
  ] as const;

  return (
    <WorkbenchLayout
      voiceover={voiceover}
      title={settings.title}
      onTitleChange={settings.setTitle}
      hasTitleChanges={settings.hasTitleChanges}
      isTitleDisabled={isGenerating}
      tabs={tabs}
      onDelete={onDelete}
      isDeleting={isDeleting}
      isApproved={isApproved}
      isAdmin={isAdmin}
      onApprove={onApprove}
      onRevoke={onRevoke}
      isApprovalPending={isApprovalPending}
      canExportAudio={canExportAudio}
      canExportScript={canExportScript}
      onExportAudio={onExportAudio}
      onExportScript={onExportScript}
      onCopyTranscript={onCopyTranscript}
      rightPanel={assistantPanel}
      audioStrip={
        displayAudio ? (
          <AudioStage src={displayAudio.url} duration={displayAudio.duration} />
        ) : null
      }
      actionBar={
        <ActionBar
          status={voiceover.status}
          errorMessage={voiceover.errorMessage}
          isGenerating={isGenerating}
          hasChanges={hasChanges}
          hasText={hasText}
          isSaving={isSaving}
          onGenerate={onGenerate}
        />
      }
    />
  );
}
