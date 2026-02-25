import {
  FileTextIcon,
  ImageIcon,
  MixerHorizontalIcon,
  PlusIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import type { DocumentListItem } from '@/features/documents/components/document-item';
import type { ComponentType, ReactNode } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { AddFromUrlDialog } from '@/features/documents/components/add-from-url-dialog';
import { DocumentEntryMenu } from '@/features/documents/components/document-entry-menu';
import { ResearchChatContainer } from '@/features/documents/components/research-chat-container';
import { UploadDocumentDialog } from '@/features/documents/components/upload-document-dialog';
import { useCreateFromUrl } from '@/features/documents/hooks/use-create-from-url';
import { useDocumentsOrdered } from '@/features/documents/hooks/use-document-list';
import { useInfographicList } from '@/features/infographics/hooks';
import { useCreateInfographic } from '@/features/infographics/hooks/use-create-infographic';
import { useOptimisticCreate as useCreatePodcast } from '@/features/podcasts/hooks/use-optimistic-create';
import { usePodcastsOrdered } from '@/features/podcasts/hooks/use-podcast-list';
import { useVoiceoversOrdered } from '@/features/voiceovers/hooks';
import { useCreateVoiceover } from '@/features/voiceovers/hooks/use-create-voiceover';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';
import { formatDuration } from '@/shared/lib/formatters';

export const Route = createFileRoute('/_protected/dashboard')({
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(
        apiClient.documents.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.podcasts.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.voiceovers.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.infographics.list.queryOptions({ input: {} }),
      ),
    ]),
  component: Dashboard,
});

interface RecentSectionProps<T> {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  count: number;
  items: T[];
  isLoading: boolean;
  emptyMessage: string;
  linkTo: string;
  action: ReactNode;
  emptyAction?: ReactNode;
  renderItem: (item: T) => ReactNode;
}

function RecentSection<T>({
  title,
  icon: Icon,
  iconColor,
  count,
  items,
  isLoading,
  emptyMessage,
  linkTo,
  action,
  emptyAction,
  renderItem,
}: RecentSectionProps<T>) {
  return (
    <div className="recent-section">
      <div className="recent-section-header">
        <div className="recent-section-title">
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
          <h3>{title}</h3>
          {count > 0 && <span className="recent-section-count">{count}</span>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Link to={linkTo} className="text-link">
            View all
          </Link>
        </div>
      </div>
      <div className="recent-section-body">
        {isLoading ? (
          <div className="loading-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : items.length === 0 ? (
          <div className="recent-section-empty">
            <p className="text-body">{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

interface DocumentsRecentSectionProps {
  count: number;
  items: DocumentListItem[];
  isLoading: boolean;
  onUpload: () => void;
  onUrl: () => void;
  onResearch: () => void;
}

function DocumentsRecentSection({
  count,
  items,
  isLoading,
  onUpload,
  onUrl,
  onResearch,
}: DocumentsRecentSectionProps) {
  return (
    <RecentSection
      title="Documents"
      icon={FileTextIcon}
      iconColor="text-sky-600 dark:text-sky-400"
      count={count}
      items={items}
      isLoading={isLoading}
      emptyMessage="No documents yet"
      linkTo="/documents"
      action={
        <DocumentEntryMenu
          variant="ghost"
          size="sm"
          className="text-xs"
          onResearch={onResearch}
          onUrl={onUrl}
          onUpload={onUpload}
        />
      }
      emptyAction={
        <DocumentEntryMenu
          onResearch={onResearch}
          onUrl={onUrl}
          onUpload={onUpload}
        />
      }
      renderItem={(doc) => (
        <Link
          key={doc.id}
          to="/documents/$documentId"
          params={{ documentId: doc.id }}
          className="recent-item"
        >
          <div className="recent-item-icon bg-sky-500/10">
            <FileTextIcon className="text-sky-600 dark:text-sky-400" />
          </div>
          <div className="recent-item-info">
            <div className="recent-item-title">{doc.title}</div>
            <div className="recent-item-meta">
              {doc.wordCount.toLocaleString()} words
            </div>
          </div>
        </Link>
      )}
    />
  );
}

interface StatCardProps {
  label: string;
  linkTo: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  count: number;
  isLoading: boolean;
}

function StatCard({
  label,
  linkTo,
  icon: Icon,
  iconBg,
  iconColor,
  count,
  isLoading,
}: StatCardProps) {
  return (
    <Link to={linkTo} className="stat-card group">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon ${iconBg}`}>
          <Icon className={iconColor} />
        </div>
      </div>
      <span className="stat-card-value">
        {isLoading ? <Spinner className="w-5 h-5" /> : count}
      </span>
    </Link>
  );
}

function Dashboard() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);

  useEffect(() => {
    document.title = 'Dashboard - Content Studio';
  }, []);

  const { data: documents, isLoading: docsLoading } = useDocumentsOrdered({
    orderBy: 'desc',
  });
  const { data: podcasts, isLoading: podcastsLoading } = usePodcastsOrdered({
    orderBy: 'desc',
  });
  const { data: voiceovers, isLoading: voiceoversLoading } =
    useVoiceoversOrdered({ orderBy: 'desc' });
  const { data: infographics, isLoading: infographicsLoading } =
    useInfographicList();

  const createPodcast = useCreatePodcast();
  const createVoiceover = useCreateVoiceover();
  const createInfographic = useCreateInfographic();
  const createFromUrlMutation = useCreateFromUrl();

  const handleCreateFromUrl = useCallback(
    (url: string, title?: string) => {
      createFromUrlMutation.mutate(
        { url, title },
        {
          onSuccess: () => {
            setUrlDialogOpen(false);
          },
        },
      );
    },
    [createFromUrlMutation],
  );

  const docCount = documents?.length ?? 0;
  const podcastCount = podcasts?.length ?? 0;
  const voiceoverCount = voiceovers?.length ?? 0;
  const infographicCount = infographics?.length ?? 0;

  const recentDocs = documents?.slice(0, 5) ?? [];
  const recentPodcasts = podcasts?.slice(0, 5) ?? [];
  const recentVoiceovers = voiceovers?.slice(0, 4) ?? [];
  const recentInfographics = infographics?.slice(0, 4) ?? [];

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
          count={docCount}
          isLoading={docsLoading}
        />
        <StatCard
          label="Podcasts"
          linkTo="/podcasts"
          icon={MixerHorizontalIcon}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
          count={podcastCount}
          isLoading={podcastsLoading}
        />
        <StatCard
          label="Voiceovers"
          linkTo="/voiceovers"
          icon={SpeakerLoudIcon}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          count={voiceoverCount}
          isLoading={voiceoversLoading}
        />
        <StatCard
          label="Infographics"
          linkTo="/infographics"
          icon={ImageIcon}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          count={infographicCount}
          isLoading={infographicsLoading}
        />
      </div>

      {/* Content Grid - 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up stagger-2">
        <DocumentsRecentSection
          count={docCount}
          items={recentDocs}
          isLoading={docsLoading}
          onResearch={() => setResearchDialogOpen(true)}
          onUrl={() => setUrlDialogOpen(true)}
          onUpload={() => setUploadOpen(true)}
        />

        <RecentSection
          title="Podcasts"
          icon={MixerHorizontalIcon}
          iconColor="text-violet-600 dark:text-violet-400"
          count={podcastCount}
          items={recentPodcasts}
          isLoading={podcastsLoading}
          emptyMessage="No podcasts yet"
          linkTo="/podcasts"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                createPodcast.mutate({
                  title: 'Untitled Podcast',
                  format: 'conversation',
                })
              }
              disabled={createPodcast.isPending}
              className="gap-1.5 text-xs"
              aria-label="Create podcast"
            >
              {createPodcast.isPending ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {CREATE_ACTION_LABELS.podcast}
            </Button>
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
                  {podcast.duration
                    ? formatDuration(podcast.duration)
                    : 'No audio'}
                </div>
              </div>
            </Link>
          )}
        />

        <RecentSection
          title="Voiceovers"
          icon={SpeakerLoudIcon}
          iconColor="text-emerald-600 dark:text-emerald-400"
          count={voiceoverCount}
          items={recentVoiceovers}
          isLoading={voiceoversLoading}
          emptyMessage="No voiceovers yet"
          linkTo="/voiceovers"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                createVoiceover.mutate({ title: 'Untitled Voiceover' })
              }
              disabled={createVoiceover.isPending}
              className="gap-1.5 text-xs"
              aria-label="Create voiceover"
            >
              {createVoiceover.isPending ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {CREATE_ACTION_LABELS.voiceover}
            </Button>
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

        <RecentSection
          title="Infographics"
          icon={ImageIcon}
          iconColor="text-amber-600 dark:text-amber-400"
          count={infographicCount}
          items={recentInfographics}
          isLoading={infographicsLoading}
          emptyMessage="No infographics yet"
          linkTo="/infographics"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                createInfographic.mutate({
                  title: 'Untitled Infographic',
                  format: 'portrait',
                })
              }
              disabled={createInfographic.isPending}
              className="gap-1.5 text-xs"
              aria-label="Create infographic"
            >
              {createInfographic.isPending ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {CREATE_ACTION_LABELS.infographic}
            </Button>
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
      </div>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <AddFromUrlDialog
        open={urlDialogOpen}
        onOpenChange={setUrlDialogOpen}
        onSubmit={handleCreateFromUrl}
        isSubmitting={createFromUrlMutation.isPending}
      />
      <ResearchChatContainer
        open={researchDialogOpen}
        onOpenChange={setResearchDialogOpen}
      />
    </div>
  );
}
