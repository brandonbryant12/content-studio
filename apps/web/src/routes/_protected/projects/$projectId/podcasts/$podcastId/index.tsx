import {
  ArrowLeftIcon,
  TrashIcon,
  ReloadIcon,
  FileTextIcon,
  SpeakerLoudIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AudioPlayer } from '@/routes/_protected/podcasts/-components/audio-player';
import { ScriptViewer } from '@/routes/_protected/podcasts/-components/script-viewer';
import { StatusDisplay } from '@/routes/_protected/podcasts/-components/status-display';
import {
  type PodcastStatus,
  getStatusConfig,
} from '@/routes/_protected/podcasts/-constants/status';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';
import { formatDuration } from '@/lib/formatters';
import Spinner from '@/routes/-components/common/spinner';

export const Route = createFileRoute(
  '/_protected/projects/$projectId/podcasts/$podcastId/',
)({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastDetailPage,
});

function StatusBadge({ status }: { status: PodcastStatus }) {
  const config = getStatusConfig(status);
  return <Badge variant={config.badgeVariant}>{config.label}</Badge>;
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
      <span className="text-gray-500 dark:text-gray-400 text-sm">{label}:</span>
      <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
        {value}
      </span>
    </div>
  );
}

function PodcastDetailPage() {
  const { projectId, podcastId } = Route.useParams();
  const navigate = useNavigate();

  const { data: podcast, isPending } = useQuery({
    ...apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 3 seconds while generating
      if (
        status === 'generating_script' ||
        status === 'generating_audio' ||
        status === 'script_ready'
      ) {
        return 3000;
      }
      return false;
    },
  });

  const generateMutation = useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onSuccess: () => {
        invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start generation');
      },
    }),
  );

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateQueries('podcasts', 'projects');
        toast.success('Podcast deleted');
        navigate({
          to: '/projects/$projectId',
          params: { projectId },
        });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete podcast');
      },
    }),
  );

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl">
        <p className="text-center text-gray-500 dark:text-gray-400 py-16">
          Podcast not found.
        </p>
      </div>
    );
  }

  const isReady = podcast.status === 'ready';
  const isFailed = podcast.status === 'failed';
  const isDraft = podcast.status === 'draft';

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link to="/projects/$projectId" params={{ projectId }}>
          <Button variant="ghost" size="icon" className="shrink-0 mt-1">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {podcast.title}
            </h1>
            <StatusBadge status={podcast.status} />
          </div>
          {podcast.description && (
            <p className="text-gray-500 dark:text-gray-400">
              {podcast.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {(isFailed || isDraft) && (
            <Button
              variant="outline"
              onClick={() => generateMutation.mutate({ id: podcastId })}
              disabled={generateMutation.isPending}
              className="border-gray-200 dark:border-gray-700"
            >
              <ReloadIcon className="w-4 h-4 mr-2" />
              {isDraft ? 'Generate' : 'Retry'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate({ id: podcastId })}
            disabled={deleteMutation.isPending}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {deleteMutation.isPending ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Status Banner (only when not ready) */}
      {!isReady && (
        <div className="mb-6">
          <StatusDisplay
            status={podcast.status}
            errorMessage={podcast.errorMessage}
          />
        </div>
      )}

      {/* Audio Player */}
      {isReady && podcast.audioUrl && (
        <div className="mb-6">
          <AudioPlayer url={podcast.audioUrl} />
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Basic Info */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Details
          </h2>
          <div className="flex flex-wrap gap-2">
            <MetadataItem
              label="Format"
              value={
                podcast.format === 'conversation' ? 'Conversation' : 'Voice Over'
              }
            />
            {podcast.duration && (
              <MetadataItem
                label="Duration"
                value={formatDuration(podcast.duration)}
              />
            )}
            {podcast.targetDurationMinutes && (
              <MetadataItem
                label="Target"
                value={`${podcast.targetDurationMinutes} min`}
              />
            )}
            <MetadataItem
              label="Created"
              value={new Date(podcast.createdAt).toLocaleDateString()}
            />
          </div>
        </div>

        {/* Voice Info */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Voices
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <PersonIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Host</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {podcast.hostVoiceName || podcast.hostVoice || 'Default'}
                </p>
              </div>
            </div>
            {podcast.format === 'conversation' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="w-8 h-8 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/50 flex items-center justify-center">
                  <PersonIcon className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Co-Host
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {podcast.coHostVoiceName || podcast.coHostVoice || 'Default'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {podcast.tags && podcast.tags.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {podcast.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Script */}
      {podcast.script && podcast.script.segments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <SpeakerLoudIcon className="w-5 h-5 text-violet-500" />
            Script
          </h2>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900">
            <ScriptViewer
              segments={podcast.script.segments}
              summary={podcast.script.summary}
            />
          </div>
        </div>
      )}

      {/* Source Documents */}
      {podcast.documents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FileTextIcon className="w-5 h-5 text-blue-500" />
            Source Documents ({podcast.documents.length})
          </h2>
          <div className="space-y-2">
            {podcast.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <FileTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {doc.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
