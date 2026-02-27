import {
  FileTextIcon,
  ImageIcon,
  MixerHorizontalIcon,
  PlusIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { OnboardingGuidance } from './onboarding-guidance';
import { DocumentsRecentSection, RecentSection } from './recent-section';
import { StatCard } from './stat-card';
import {
  type DocumentListItem,
  AddFromUrlDialog,
  ResearchChatContainer,
  UploadDocumentDialog,
} from '@/features/documents/components';
import {
  CreateInfographicDialog,
  type CreateInfographicPayload,
} from '@/features/infographics/components/create-infographic-dialog';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';
import { formatDuration } from '@/shared/lib/formatters';

interface ContentCounts {
  documents: number;
  podcasts: number;
  voiceovers: number;
  infographics: number;
}

interface LoadingState {
  documents: boolean;
  podcasts: boolean;
  voiceovers: boolean;
  infographics: boolean;
}

interface RecentItems {
  documents: DocumentListItem[];
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
  onCreateInfographic: (payload: CreateInfographicPayload) => void;
  isInfographicPending: boolean;
}

interface DocumentDialogs {
  uploadOpen: boolean;
  onUploadOpenChange: (open: boolean) => void;
  urlDialogOpen: boolean;
  onUrlDialogOpenChange: (open: boolean) => void;
  researchDialogOpen: boolean;
  onResearchDialogOpenChange: (open: boolean) => void;
  onCreateFromUrl: (url: string, title?: string) => void;
  isCreateFromUrlPending: boolean;
}

interface OnboardingState {
  show: boolean;
  onDismiss: () => void;
}

export interface DashboardPageProps {
  counts: ContentCounts;
  loading: LoadingState;
  recent: RecentItems;
  createActions: CreateActions;
  documentDialogs: DocumentDialogs;
  onboarding: OnboardingState;
}

export function DashboardPage({
  counts,
  loading,
  recent,
  createActions,
  documentDialogs,
  onboarding,
}: DashboardPageProps) {
  return (
    <div className="page-container">
      <h1 className="sr-only">Dashboard</h1>

      {/* Stats Row */}
      <div className="content-grid-4 mb-8 animate-fade-in-up stagger-1">
        <StatCard
          label="Documents"
          linkTo="/documents"
          icon={FileTextIcon}
          iconBg="bg-sky-500/10"
          iconColor="text-sky-600 dark:text-sky-400"
          count={counts.documents}
          isLoading={loading.documents}
        />
        <StatCard
          label="Podcasts"
          linkTo="/podcasts"
          icon={MixerHorizontalIcon}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
          count={counts.podcasts}
          isLoading={loading.podcasts}
        />
        <StatCard
          label="Voiceovers"
          linkTo="/voiceovers"
          icon={SpeakerLoudIcon}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          count={counts.voiceovers}
          isLoading={loading.voiceovers}
        />
        <StatCard
          label="Infographics"
          linkTo="/infographics"
          icon={ImageIcon}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          count={counts.infographics}
          isLoading={loading.infographics}
        />
      </div>

      {/* First-value onboarding guidance */}
      {onboarding.show && (
        <div className="mb-8">
          <OnboardingGuidance onDismiss={onboarding.onDismiss} />
        </div>
      )}

      {/* Content Grid - 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up stagger-2">
        <DocumentsRecentSection
          count={counts.documents}
          items={recent.documents}
          isLoading={loading.documents}
          onResearch={() => documentDialogs.onResearchDialogOpenChange(true)}
          onUrl={() => documentDialogs.onUrlDialogOpenChange(true)}
          onUpload={() => documentDialogs.onUploadOpenChange(true)}
        />

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
      </div>

      <UploadDocumentDialog
        open={documentDialogs.uploadOpen}
        onOpenChange={documentDialogs.onUploadOpenChange}
      />
      <AddFromUrlDialog
        open={documentDialogs.urlDialogOpen}
        onOpenChange={documentDialogs.onUrlDialogOpenChange}
        onSubmit={documentDialogs.onCreateFromUrl}
        isSubmitting={documentDialogs.isCreateFromUrlPending}
      />
      <ResearchChatContainer
        open={documentDialogs.researchDialogOpen}
        onOpenChange={documentDialogs.onResearchDialogOpenChange}
      />
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
      onClick={onClick}
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
      emptyMessage="No podcasts yet"
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
      emptyMessage="No voiceovers yet"
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
  onCreateInfographic: (payload: CreateInfographicPayload) => void;
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
      emptyMessage="No infographics yet"
      linkTo="/infographics"
      action={
        <CreateInfographicDialog
          isCreating={isPending}
          onCreate={onCreateInfographic}
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            className="gap-1.5 text-xs"
            aria-label={CREATE_ACTION_LABELS.infographic}
          >
            {isPending ? (
              <Spinner className="w-3.5 h-3.5" />
            ) : (
              <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {CREATE_ACTION_LABELS.infographic}
          </Button>
        </CreateInfographicDialog>
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
