import {
  ArrowRightIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PlusIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { QuickStartPanel } from './quick-start-panel';
import { SourcesRecentSection, RecentSection } from './recent-section';
import { APP_NAME } from '@/constants';
import { isDeepResearchEnabled } from '@/env';
import {
  type SourceListItem,
  AddFromUrlDialog,
  ResearchChatContainer,
  UploadSourceDialog,
} from '@/features/sources/components';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';
import { formatDuration } from '@/shared/lib/formatters';

interface ContentCounts {
  sources: number;
  podcasts: number;
  voiceovers: number;
  infographics: number;
}

interface LoadingState {
  sources: boolean;
  podcasts: boolean;
  voiceovers: boolean;
  infographics: boolean;
}

interface RecentItems {
  sources: SourceListItem[];
  podcasts: Array<{
    id: string;
    title: string;
    duration: number | null;
  }>;
  voiceovers: Array<{
    id: string;
    title: string;
    duration: number | null;
    voiceName: string | null;
  }>;
  infographics: Array<{
    id: string;
    title: string;
    format: string;
  }>;
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
  uploadOpen: boolean;
  onUploadOpenChange: (open: boolean) => void;
  urlDialogOpen: boolean;
  onUrlDialogOpenChange: (open: boolean) => void;
  researchDialogOpen: boolean;
  onResearchDialogOpenChange: (open: boolean) => void;
  researchAutoGenPodcast: boolean;
  onOpenResearchWithPodcast: () => void;
  onCreateFromUrl: (url: string, title?: string) => void;
  isCreateFromUrlPending: boolean;
}

export interface DashboardPageProps {
  counts: ContentCounts;
  loading: LoadingState;
  recent: RecentItems;
  createActions: CreateActions;
  documentDialogs: DocumentDialogs;
}

export function DashboardPage({
  counts,
  loading,
  recent,
  createActions,
  documentDialogs,
}: DashboardPageProps) {
  return (
    <div className="page-container">
      {/* Editorial header */}
      <div className="mb-6">
        <h1 className="page-title mb-1">Dashboard</h1>
        <p className="text-body text-muted-foreground">
          Create AI-generated podcasts, voiceovers, and visuals — grounded in
          your source material.
        </p>
      </div>

      {/* Workflow strip — persistent "how it works" reminder */}
      <WorkflowStrip />

      {/* Featured: Research to Podcast */}
      {isDeepResearchEnabled && (
        <div className="mb-6 animate-fade-in-up stagger-1">
          <ResearchToPodcastCTA
            onStart={documentDialogs.onOpenResearchWithPodcast}
          />
        </div>
      )}

      {/* Adaptive quick-start panel */}
      <div className="mb-8">
        <QuickStartPanel
          counts={counts}
          createActions={createActions}
          documentDialogs={documentDialogs}
        />
      </div>

      {/* Recent content — outputs first */}
      <div className="mb-4 animate-fade-in-up stagger-2">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Recent content
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 animate-fade-in-up stagger-2">
        <PodcastsRecentSection
          count={counts.podcasts}
          items={recent.podcasts}
          isLoading={loading.podcasts}
          onCreatePodcast={createActions.onCreatePodcast}
          isPending={createActions.isPodcastPending}
        />

        <VoiceoversRecentSection
          count={counts.voiceovers}
          items={recent.voiceovers}
          isLoading={loading.voiceovers}
          onCreateVoiceover={createActions.onCreateVoiceover}
          isPending={createActions.isVoiceoverPending}
        />

        <InfographicsRecentSection
          count={counts.infographics}
          items={recent.infographics}
          isLoading={loading.infographics}
          onCreateInfographic={createActions.onCreateInfographic}
          isPending={createActions.isInfographicPending}
        />

        <SourcesRecentSection
          count={counts.sources}
          items={recent.sources}
          isLoading={loading.sources}
          onResearch={() => documentDialogs.onResearchDialogOpenChange(true)}
          onUrl={() => documentDialogs.onUrlDialogOpenChange(true)}
          onUpload={() => documentDialogs.onUploadOpenChange(true)}
        />
      </div>

      <UploadSourceDialog
        open={documentDialogs.uploadOpen}
        onOpenChange={documentDialogs.onUploadOpenChange}
      />
      <AddFromUrlDialog
        open={documentDialogs.urlDialogOpen}
        onOpenChange={documentDialogs.onUrlDialogOpenChange}
        onSubmit={documentDialogs.onCreateFromUrl}
        isSubmitting={documentDialogs.isCreateFromUrlPending}
      />
      {isDeepResearchEnabled ? (
        <ResearchChatContainer
          open={documentDialogs.researchDialogOpen}
          onOpenChange={documentDialogs.onResearchDialogOpenChange}
          defaultAutoGeneratePodcast={documentDialogs.researchAutoGenPodcast}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow strip — compact persistent "how it works"                */
/* ------------------------------------------------------------------ */

const WORKFLOW_STEPS = [
  {
    number: '1',
    label: 'Upload sources',
    detail: isDeepResearchEnabled
      ? 'PDFs, URLs, or AI research'
      : 'PDFs and URLs',
    color: 'bg-sky-500 text-primary-foreground',
    textColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    number: '2',
    label: 'AI creates content',
    detail: 'Podcasts, voiceovers, infographics',
    color: 'bg-primary text-primary-foreground',
    textColor: 'text-primary',
  },
  {
    number: '3',
    label: 'Review & refine',
    detail: 'Edit scripts, swap voices, adjust styles',
    color: 'bg-emerald-500 text-primary-foreground',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
] as const;

function WorkflowStrip() {
  return (
    <div
      className="mb-8 rounded-xl border border-border/60 bg-card/50 px-4 py-3 animate-fade-in"
      aria-label={`How ${APP_NAME} works`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {WORKFLOW_STEPS.map((step, i) => (
          <div key={step.number} className="flex items-start gap-3">
            {/* Step number */}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step.color}`}
            >
              {step.number}
            </span>
            <div className="min-w-0">
              <span className={`text-sm font-medium ${step.textColor}`}>
                {step.label}
              </span>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                {step.detail}
              </p>
            </div>
            {/* Connector arrow — desktop only, not on last step */}
            {i < WORKFLOW_STEPS.length - 1 && (
              <ArrowRightIcon
                className="hidden sm:block w-4 h-4 text-border shrink-0 mt-1 ml-auto"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Research-to-Podcast feature CTA                                   */
/* ------------------------------------------------------------------ */

function ResearchToPodcastCTA({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/80 via-background to-sky-50/50 dark:from-violet-950/30 dark:via-background dark:to-sky-950/20 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/20">
            <MagnifyingGlassIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
              Research to Podcast
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Describe any topic &mdash; AI researches it in depth and creates a
              podcast episode from the findings, all in one step.
            </p>
          </div>
        </div>
        <Button onClick={onStart} className="shrink-0 gap-2 sm:self-center">
          <MagnifyingGlassIcon className="w-4 h-4" aria-hidden="true" />
          Try it now
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Private sub-presenters for each content-type recent section       */
/* ------------------------------------------------------------------ */

function CreateButton({
  label,
  isPending,
  onClick,
}: {
  label: string;
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onClick()}
      disabled={isPending}
      className="gap-1.5 text-xs"
      aria-label={label}
    >
      {isPending ? (
        <Spinner className="w-3.5 h-3.5" />
      ) : (
        <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

function PodcastsRecentSection({
  count,
  items,
  isLoading,
  onCreatePodcast,
  isPending,
}: {
  count: number;
  items: RecentItems['podcasts'];
  isLoading: boolean;
  onCreatePodcast: () => void;
  isPending: boolean;
}) {
  return (
    <RecentSection
      title="Podcasts"
      icon={MixerHorizontalIcon}
      iconColor="text-violet-600 dark:text-violet-400"
      count={count}
      items={items}
      isLoading={isLoading}
      emptyMessage="Create a podcast from your sources"
      linkTo="/podcasts"
      action={
        <CreateButton
          label={CREATE_ACTION_LABELS.podcast}
          isPending={isPending}
          onClick={onCreatePodcast}
        />
      }
      renderItem={(podcast) => (
        <Link
          key={podcast.id}
          to="/podcasts/$podcastId"
          params={{ podcastId: podcast.id }}
          search={{ version: undefined }}
          className="recent-item"
        >
          <div className="recent-item-icon bg-violet-500/10">
            <MixerHorizontalIcon className="text-violet-600 dark:text-violet-400" />
          </div>
          <div className="recent-item-info">
            <div className="recent-item-title">{podcast.title}</div>
            <div className="recent-item-meta">
              {podcast.duration ? formatDuration(podcast.duration) : 'No audio'}
            </div>
          </div>
        </Link>
      )}
    />
  );
}

function VoiceoversRecentSection({
  count,
  items,
  isLoading,
  onCreateVoiceover,
  isPending,
}: {
  count: number;
  items: RecentItems['voiceovers'];
  isLoading: boolean;
  onCreateVoiceover: () => void;
  isPending: boolean;
}) {
  return (
    <RecentSection
      title="Voiceovers"
      icon={SpeakerLoudIcon}
      iconColor="text-emerald-600 dark:text-emerald-400"
      count={count}
      items={items}
      isLoading={isLoading}
      emptyMessage="Record a voiceover with AI narration"
      linkTo="/voiceovers"
      action={
        <CreateButton
          label={CREATE_ACTION_LABELS.voiceover}
          isPending={isPending}
          onClick={onCreateVoiceover}
        />
      }
      renderItem={(vo) => (
        <Link
          key={vo.id}
          to="/voiceovers/$voiceoverId"
          params={{ voiceoverId: vo.id }}
          className="recent-item"
        >
          <div className="recent-item-icon bg-emerald-500/10">
            <SpeakerLoudIcon className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="recent-item-info">
            <div className="recent-item-title">{vo.title}</div>
            <div className="recent-item-meta">
              {vo.duration ? formatDuration(vo.duration) : 'Draft'}
              {vo.voiceName ? ` · ${vo.voiceName}` : ''}
            </div>
          </div>
        </Link>
      )}
    />
  );
}

function InfographicsRecentSection({
  count,
  items,
  isLoading,
  onCreateInfographic,
  isPending,
}: {
  count: number;
  items: RecentItems['infographics'];
  isLoading: boolean;
  onCreateInfographic: () => void;
  isPending: boolean;
}) {
  return (
    <RecentSection
      title="Infographics"
      icon={ImageIcon}
      iconColor="text-amber-600 dark:text-amber-400"
      count={count}
      items={items}
      isLoading={isLoading}
      emptyMessage="Generate visuals from your content"
      linkTo="/infographics"
      action={
        <CreateButton
          label={CREATE_ACTION_LABELS.infographic}
          isPending={isPending}
          onClick={onCreateInfographic}
        />
      }
      renderItem={(ig) => (
        <Link
          key={ig.id}
          to="/infographics/$infographicId"
          params={{ infographicId: ig.id }}
          className="recent-item"
        >
          <div className="recent-item-icon bg-amber-500/10">
            <ImageIcon className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="recent-item-info">
            <div className="recent-item-title">{ig.title}</div>
            <div className="recent-item-meta">{ig.format}</div>
          </div>
        </Link>
      )}
    />
  );
}
