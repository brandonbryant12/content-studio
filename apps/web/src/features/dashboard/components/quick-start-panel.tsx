import {
  FileTextIcon,
  ImageIcon,
  Link2Icon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import type { ReactNode } from 'react';

interface ContentCounts {
  sources: number;
  podcasts: number;
  voiceovers: number;
  infographics: number;
}

interface CreateActions {
  onCreatePodcast: () => void;
  isPodcastPending: boolean;
  onCreateVoiceover: () => void;
  isVoiceoverPending: boolean;
}

interface DocumentDialogs {
  onUploadOpenChange: (open: boolean) => void;
  onUrlDialogOpenChange: (open: boolean) => void;
  onResearchDialogOpenChange: (open: boolean) => void;
}

export interface QuickStartPanelProps {
  counts: ContentCounts;
  createActions: CreateActions;
  documentDialogs: DocumentDialogs;
}

export function QuickStartPanel({
  counts,
  createActions,
  documentDialogs,
}: QuickStartPanelProps) {
  const hasDocuments = counts.sources > 0;
  const hasGenerated =
    counts.podcasts > 0 || counts.voiceovers > 0 || counts.infographics > 0;

  if (!hasDocuments) {
    return <AddSourcesCard documentDialogs={documentDialogs} />;
  }

  if (!hasGenerated) {
    return <CreateFirstContentCard createActions={createActions} />;
  }

  const missingTypes: Array<{ label: string; icon: ReactNode }> = [];
  if (counts.podcasts === 0)
    missingTypes.push({
      label: 'Podcast',
      icon: <MixerHorizontalIcon className="w-3.5 h-3.5" />,
    });
  if (counts.voiceovers === 0)
    missingTypes.push({
      label: 'Voiceover',
      icon: <SpeakerLoudIcon className="w-3.5 h-3.5" />,
    });
  if (counts.infographics === 0)
    missingTypes.push({
      label: 'Infographic',
      icon: <ImageIcon className="w-3.5 h-3.5" />,
    });

  if (missingTypes.length > 0) {
    return (
      <SuggestionBar
        missingTypes={missingTypes}
        createActions={createActions}
        documentDialogs={documentDialogs}
      />
    );
  }

  return (
    <QuickCreateToolbar
      createActions={createActions}
      documentDialogs={documentDialogs}
    />
  );
}

function AddSourcesCard({
  documentDialogs,
}: {
  documentDialogs: DocumentDialogs;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-5 max-w-lg">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
          Add your first source
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sources ground every piece of content AI creates. Upload a document,
          import a URL, or let AI research a topic for you.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionCard
          icon={
            <UploadIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          }
          iconBg="bg-sky-500/10"
          title="Upload a file"
          description="PDF, DOCX, TXT, or Markdown"
          onClick={() => documentDialogs.onUploadOpenChange(true)}
        />
        <ActionCard
          icon={
            <Link2Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          }
          iconBg="bg-violet-500/10"
          title="Import from URL"
          description="Paste any web page link"
          onClick={() => documentDialogs.onUrlDialogOpenChange(true)}
        />
        <ActionCard
          icon={
            <MagnifyingGlassIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          }
          iconBg="bg-emerald-500/10"
          title="AI deep research"
          description="Let AI explore a topic"
          onClick={() => documentDialogs.onResearchDialogOpenChange(true)}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  iconBg,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-xl border border-border/60 bg-background p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-sm text-left"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} mb-3`}
      >
        {icon}
      </div>
      <span className="font-medium text-sm text-foreground mb-0.5">
        {title}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function CreateFirstContentCard({
  createActions,
}: {
  createActions: CreateActions;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-5 max-w-lg">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
          Create your first content
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your sources are ready. Choose a format to create your first piece of
          AI-generated content.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={createActions.onCreatePodcast}
          disabled={createActions.isPodcastPending}
        >
          <MixerHorizontalIcon className="w-4 h-4" aria-hidden="true" />
          Create Podcast
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={createActions.onCreateVoiceover}
          disabled={createActions.isVoiceoverPending}
        >
          <SpeakerLoudIcon className="w-4 h-4" aria-hidden="true" />
          Create Voiceover
        </Button>
      </div>
    </div>
  );
}

function SuggestionBar({
  missingTypes,
  createActions,
  documentDialogs,
}: {
  missingTypes: Array<{ label: string; icon: ReactNode }>;
  createActions: CreateActions;
  documentDialogs: DocumentDialogs;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground mr-1">Try creating:</span>
      {missingTypes.map(({ label }) => {
        if (label === 'Podcast') {
          return (
            <Button
              key={label}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={createActions.onCreatePodcast}
              disabled={createActions.isPodcastPending}
            >
              <MixerHorizontalIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </Button>
          );
        }
        if (label === 'Voiceover') {
          return (
            <Button
              key={label}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={createActions.onCreateVoiceover}
              disabled={createActions.isVoiceoverPending}
            >
              <SpeakerLoudIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </Button>
          );
        }
        // Infographic — just link to upload since it needs a dialog
        return (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => documentDialogs.onUploadOpenChange(true)}
          >
            <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
          </Button>
        );
      })}
    </div>
  );
}

function QuickCreateToolbar({
  createActions,
  documentDialogs,
}: {
  createActions: CreateActions;
  documentDialogs: DocumentDialogs;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground mr-1">Quick create:</span>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => documentDialogs.onUploadOpenChange(true)}
      >
        <FileTextIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Source
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={createActions.onCreatePodcast}
        disabled={createActions.isPodcastPending}
      >
        <MixerHorizontalIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Podcast
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={createActions.onCreateVoiceover}
        disabled={createActions.isVoiceoverPending}
      >
        <SpeakerLoudIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Voiceover
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => {}}
        title="Use the infographics section below"
      >
        <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Infographic
      </Button>
    </div>
  );
}
