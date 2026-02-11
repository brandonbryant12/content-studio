import {
  FileTextIcon,
  ImageIcon,
  MixerHorizontalIcon,
  PlusIcon,
  SpeakerLoudIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { UploadDocumentDialog } from '@/features/documents/components/upload-document-dialog';
import { useDocumentsOrdered } from '@/features/documents/hooks/use-document-list';
import { useInfographicList } from '@/features/infographics/hooks';
import { useOptimisticCreate as useCreateInfographic } from '@/features/infographics/hooks/use-optimistic-create';
import { useOptimisticCreate as useCreatePodcast } from '@/features/podcasts/hooks/use-optimistic-create';
import { usePodcastsOrdered } from '@/features/podcasts/hooks/use-podcast-list';
import { useVoiceoversOrdered } from '@/features/voiceovers/hooks';
import { useOptimisticCreate as useCreateVoiceover } from '@/features/voiceovers/hooks/use-optimistic-create';
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

function Dashboard() {
  const [uploadOpen, setUploadOpen] = useState(false);

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
        <Link to="/documents" className="stat-card group">
          <div className="stat-card-header">
            <span className="stat-card-label">Documents</span>
            <div className="stat-card-icon bg-sky-500/10">
              <FileTextIcon className="text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <span className="stat-card-value">
            {docsLoading ? <Spinner className="w-5 h-5" /> : docCount}
          </span>
        </Link>

        <Link to="/podcasts" className="stat-card group">
          <div className="stat-card-header">
            <span className="stat-card-label">Podcasts</span>
            <div className="stat-card-icon bg-violet-500/10">
              <MixerHorizontalIcon className="text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <span className="stat-card-value">
            {podcastsLoading ? <Spinner className="w-5 h-5" /> : podcastCount}
          </span>
        </Link>

        <Link to="/voiceovers" className="stat-card group">
          <div className="stat-card-header">
            <span className="stat-card-label">Voiceovers</span>
            <div className="stat-card-icon bg-emerald-500/10">
              <SpeakerLoudIcon className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <span className="stat-card-value">
            {voiceoversLoading ? (
              <Spinner className="w-5 h-5" />
            ) : (
              voiceoverCount
            )}
          </span>
        </Link>

        <Link to="/infographics" className="stat-card group">
          <div className="stat-card-header">
            <span className="stat-card-label">Infographics</span>
            <div className="stat-card-icon bg-amber-500/10">
              <ImageIcon className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <span className="stat-card-value">
            {infographicsLoading ? (
              <Spinner className="w-5 h-5" />
            ) : (
              infographicCount
            )}
          </span>
        </Link>
      </div>

      {/* Content Grid - 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up stagger-2">
        {/* Recent Documents */}
        <div className="recent-section">
          <div className="recent-section-header">
            <div className="recent-section-title">
              <FileTextIcon
                className="w-4 h-4 text-sky-600 dark:text-sky-400"
                aria-hidden="true"
              />
              <h3>Documents</h3>
              {docCount > 0 && (
                <span className="recent-section-count">{docCount}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadOpen(true)}
                className="gap-1.5 text-xs"
                aria-label="Upload document"
              >
                <UploadIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Upload
              </Button>
              <Link to="/documents" className="text-link">
                View all
              </Link>
            </div>
          </div>
          <div className="recent-section-body">
            {docsLoading ? (
              <div className="loading-center">
                <Spinner className="w-5 h-5" />
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="recent-section-empty">
                <p className="text-body">No documents yet</p>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="text-link mt-2"
                  type="button"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              recentDocs.map((doc) => (
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
              ))
            )}
          </div>
        </div>

        {/* Recent Podcasts */}
        <div className="recent-section">
          <div className="recent-section-header">
            <div className="recent-section-title">
              <MixerHorizontalIcon
                className="w-4 h-4 text-violet-600 dark:text-violet-400"
                aria-hidden="true"
              />
              <h3>Podcasts</h3>
              {podcastCount > 0 && (
                <span className="recent-section-count">{podcastCount}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                New
              </Button>
              <Link to="/podcasts" className="text-link">
                View all
              </Link>
            </div>
          </div>
          <div className="recent-section-body">
            {podcastsLoading ? (
              <div className="loading-center">
                <Spinner className="w-5 h-5" />
              </div>
            ) : recentPodcasts.length === 0 ? (
              <div className="recent-section-empty">
                <p className="text-body">No podcasts yet</p>
              </div>
            ) : (
              recentPodcasts.map((podcast) => (
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
              ))
            )}
          </div>
        </div>

        {/* Recent Voiceovers */}
        <div className="recent-section">
          <div className="recent-section-header">
            <div className="recent-section-title">
              <SpeakerLoudIcon
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <h3>Voiceovers</h3>
              {voiceoverCount > 0 && (
                <span className="recent-section-count">{voiceoverCount}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                New
              </Button>
              <Link to="/voiceovers" className="text-link">
                View all
              </Link>
            </div>
          </div>
          <div className="recent-section-body">
            {voiceoversLoading ? (
              <div className="loading-center">
                <Spinner className="w-5 h-5" />
              </div>
            ) : recentVoiceovers.length === 0 ? (
              <div className="recent-section-empty">
                <p className="text-body">No voiceovers yet</p>
              </div>
            ) : (
              recentVoiceovers.map((vo) => (
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
              ))
            )}
          </div>
        </div>

        {/* Recent Infographics */}
        <div className="recent-section">
          <div className="recent-section-header">
            <div className="recent-section-title">
              <ImageIcon
                className="w-4 h-4 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <h3>Infographics</h3>
              {infographicCount > 0 && (
                <span className="recent-section-count">{infographicCount}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  createInfographic.mutate({
                    title: 'Untitled Infographic',
                    infographicType: 'key_takeaways',
                    stylePreset: 'modern_minimal',
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
                New
              </Button>
              <Link to="/infographics" className="text-link">
                View all
              </Link>
            </div>
          </div>
          <div className="recent-section-body">
            {infographicsLoading ? (
              <div className="loading-center">
                <Spinner className="w-5 h-5" />
              </div>
            ) : recentInfographics.length === 0 ? (
              <div className="recent-section-empty">
                <p className="text-body">No infographics yet</p>
              </div>
            ) : (
              recentInfographics.map((ig) => (
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
                    <div className="recent-item-meta">
                      {ig.infographicType.replace(/_/g, ' ')} · {ig.format}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
