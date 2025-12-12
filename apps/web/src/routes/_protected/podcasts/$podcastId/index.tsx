import {
  ArrowLeftIcon,
  TrashIcon,
  ReloadIcon,
  FileTextIcon,
  SpeakerLoudIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

export const Route = createFileRoute('/_protected/podcasts/$podcastId/')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastDetailPage,
});

type PodcastStatus = RouterOutput['podcasts']['get']['status'];

const statusConfig: Record<
  PodcastStatus,
  {
    label: string;
    message: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  draft: {
    label: 'Draft',
    message: 'Ready to generate',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    borderColor: 'border-gray-200 dark:border-gray-800',
  },
  generating_script: {
    label: 'Generating',
    message: 'Writing your script...',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  script_ready: {
    label: 'Processing',
    message: 'Script ready, creating audio...',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  generating_audio: {
    label: 'Generating',
    message: 'Synthesizing audio...',
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-50 dark:bg-violet-950/50',
    borderColor: 'border-violet-200 dark:border-violet-800',
  },
  ready: {
    label: 'Ready',
    message: 'Your podcast is ready to play!',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  failed: {
    label: 'Failed',
    message: 'Generation failed',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/50',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

function StatusBadge({ status }: { status: PodcastStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}
    >
      {config.label}
    </span>
  );
}

function StatusDisplay({
  status,
  errorMessage,
}: {
  status: PodcastStatus;
  errorMessage?: string | null;
}) {
  const config = statusConfig[status];
  const isGenerating =
    status === 'generating_script' ||
    status === 'generating_audio' ||
    status === 'script_ready';
  const isReady = status === 'ready';
  const isFailed = status === 'failed';

  return (
    <div
      className={`p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center gap-3">
        {isGenerating && (
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Spinner className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        {isReady && (
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
        {isFailed && (
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}
        <div>
          <p className={`font-medium ${config.color}`}>{config.message}</p>
          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AudioPlayer({ url }: { url: string }) {
  return (
    <div className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 rounded-xl border border-violet-200 dark:border-violet-800">
      <audio controls className="w-full" src={url}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

function ScriptViewer({
  segments,
  summary,
}: {
  segments: Array<{ speaker: string; line: string; index: number }>;
  summary?: string | null;
}) {
  if (segments.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        No script available yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800 mb-4">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">
            Summary
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{summary}</p>
        </div>
      )}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {segments.map((segment) => (
          <div key={segment.index} className="flex gap-4">
            <div className="w-20 shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                  segment.speaker.toLowerCase() === 'host'
                    ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                    : 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-700 dark:text-fuchsia-300'
                }`}
              >
                {segment.speaker}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {segment.line}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  const { podcastId } = Route.useParams();
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
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === 'podcasts',
        });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start generation');
      },
    }),
  );

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            (query.queryKey[0] === 'podcasts' ||
              query.queryKey[0] === 'projects'),
        });
        toast.success('Podcast deleted');
        // Navigate back to project
        if (podcast?.projectId) {
          navigate({
            to: '/projects/$projectId',
            params: { projectId: podcast.projectId },
          });
        } else {
          navigate({ to: '/projects' });
        }
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
        <Link
          to="/projects/$projectId"
          params={{ projectId: podcast.projectId }}
        >
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
                podcast.format === 'conversation'
                  ? 'Conversation'
                  : 'Voice Over'
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
                    {podcast.coHostVoiceName ||
                      podcast.coHostVoice ||
                      'Default'}
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
                  Document #{doc.order + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
