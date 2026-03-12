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
import { isDeepResearchEnabled } from '@/env';
import { DEEP_RESEARCH_NAME } from '@/shared/lib/source-guidance';

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
  onCreateInfographic: () => void;
  isInfographicPending: boolean;
}

interface DocumentDialogs {
  onUploadOpenChange: (open: boolean) => void;
  onUrlDialogOpenChange: (open: boolean) => void;
  onResearchDialogOpenChange: (open: boolean) => void;
  onOpenResearchWithPodcast: () => void;
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
  const actions = [
    {
      icon: <UploadIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      iconBg: 'bg-sky-500/10',
      title: 'Upload a file',
      description: 'PDF, DOCX, TXT, or Markdown',
      onClick: () => documentDialogs.onUploadOpenChange(true),
    },
    {
      icon: (
        <Link2Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
      ),
      iconBg: 'bg-violet-500/10',
      title: 'Import from URL',
      description: 'Paste any web page link',
      onClick: () => documentDialogs.onUrlDialogOpenChange(true),
    },
    ...(isDeepResearchEnabled
      ? [
          {
            icon: (
              <MagnifyingGlassIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ),
            iconBg: 'bg-emerald-500/10',
            title: DEEP_RESEARCH_NAME,
            description: 'Let AI explore a topic',
            onClick: () => documentDialogs.onResearchDialogOpenChange(true),
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-5 max-w-lg">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
          Add your first source
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sources ground every piece of content AI creates. Upload a document,
          {isDeepResearchEnabled
            ? ' import a URL, or let AI research a topic for you.'
            : ' or import a URL.'}
        </p>
      </div>
      <div
        className={`grid grid-cols-1 gap-3 ${actions.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        {actions.map((action) => (
          <ActionCard key={action.title} {...action} />
        ))}
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
      className="flex flex-col rounded-xl border border-border/60 bg-background p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} mb-3`}
      >
        {icon}
      </div>
      <span className="font-medium text-sm text-foreground mb-0.5 truncate">
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
          onClick={() => createActions.onCreatePodcast()}
          disabled={createActions.isPodcastPending}
        >
          <MixerHorizontalIcon className="w-4 h-4" aria-hidden="true" />
          Create Podcast
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => createActions.onCreateVoiceover()}
          disabled={createActions.isVoiceoverPending}
        >
          <SpeakerLoudIcon className="w-4 h-4" aria-hidden="true" />
          Create Voiceover
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => createActions.onCreateInfographic()}
          disabled={createActions.isInfographicPending}
        >
          <ImageIcon className="w-4 h-4" aria-hidden="true" />
          Create Infographic
        </Button>
      </div>
    </div>
  );
}

function SuggestionBar({
  missingTypes,
  createActions,
}: {
  missingTypes: Array<{ label: string; icon: ReactNode }>;
  createActions: CreateActions;
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
              onClick={() => createActions.onCreatePodcast()}
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
              onClick={() => createActions.onCreateVoiceover()}
              disabled={createActions.isVoiceoverPending}
            >
              <SpeakerLoudIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </Button>
          );
        }
        return (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => createActions.onCreateInfographic()}
            disabled={createActions.isInfographicPending}
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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
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
        onClick={() => createActions.onCreatePodcast()}
        disabled={createActions.isPodcastPending}
      >
        <MixerHorizontalIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Podcast
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => createActions.onCreateVoiceover()}
        disabled={createActions.isVoiceoverPending}
      >
        <SpeakerLoudIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Voiceover
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => createActions.onCreateInfographic()}
        disabled={createActions.isInfographicPending}
      >
        <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Infographic
      </Button>
      {isDeepResearchEnabled && (
        <>
          <span className="text-border" aria-hidden="true">
            |
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            onClick={() => documentDialogs.onOpenResearchWithPodcast()}
          >
            <MagnifyingGlassIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Research &rarr; Podcast
          </Button>
        </>
      )}
    </div>
  );
}
