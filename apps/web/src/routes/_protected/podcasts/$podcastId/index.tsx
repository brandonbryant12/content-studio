import {
  ArrowLeftIcon,
  TrashIcon,
  ReloadIcon,
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

const statusConfig: Record<PodcastStatus, { message: string; color: string; bgColor: string; borderColor: string }> = {
  draft: { message: 'Ready to generate', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-50 dark:bg-gray-900', borderColor: 'border-gray-200 dark:border-gray-800' },
  generating_script: { message: 'Writing your script...', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-950/50', borderColor: 'border-blue-200 dark:border-blue-800' },
  script_ready: { message: 'Script ready, creating audio...', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 dark:bg-amber-950/50', borderColor: 'border-amber-200 dark:border-amber-800' },
  generating_audio: { message: 'Synthesizing audio...', color: 'text-violet-700 dark:text-violet-300', bgColor: 'bg-violet-50 dark:bg-violet-950/50', borderColor: 'border-violet-200 dark:border-violet-800' },
  ready: { message: 'Your audio is ready!', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 dark:bg-emerald-950/50', borderColor: 'border-emerald-200 dark:border-emerald-800' },
  failed: { message: 'Generation failed', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 dark:bg-red-950/50', borderColor: 'border-red-200 dark:border-red-800' },
};

function StatusDisplay({ status, errorMessage }: { status: PodcastStatus; errorMessage?: string | null }) {
  const config = statusConfig[status];
  const isGenerating = status === 'generating_script' || status === 'generating_audio' || status === 'script_ready';
  const isReady = status === 'ready';
  const isFailed = status === 'failed';

  return (
    <div className={`p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-3">
        {isGenerating && (
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Spinner className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        {isReady && (
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isFailed && (
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <div>
          <p className={`font-medium ${config.color}`}>{config.message}</p>
          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>
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

function ScriptViewer({ segments }: { segments: Array<{ speaker: string; line: string; index: number }> }) {
  if (segments.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        No script available yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {segments.map((segment) => (
        <div key={segment.index} className="flex gap-4">
          <div className="w-20 shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
              {segment.speaker}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{segment.line}</p>
        </div>
      ))}
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function PodcastDetailPage() {
  const { podcastId } = Route.useParams();
  const navigate = useNavigate();

  const { data: podcast, isPending } = useQuery({
    ...apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 3 seconds while generating
      if (status === 'generating_script' || status === 'generating_audio' || status === 'script_ready') {
        return 3000;
      }
      return false;
    },
  });

  // Auto-trigger generation for draft podcasts
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
            Array.isArray(query.queryKey) && query.queryKey[0] === 'podcasts',
        });
        toast.success('Podcast deleted');
        navigate({ to: '/podcasts' });
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
        <p className="text-center text-gray-500 dark:text-gray-400 py-16">Podcast not found.</p>
      </div>
    );
  }

  const isReady = podcast.status === 'ready';
  const isFailed = podcast.status === 'failed';

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link to="/podcasts">
          <Button variant="ghost" size="icon" className="shrink-0 mt-1">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{podcast.title}</h1>
          {podcast.description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{podcast.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isFailed && (
            <Button
              variant="outline"
              onClick={() => generateMutation.mutate({ id: podcastId })}
              disabled={generateMutation.isPending}
              className="border-gray-200 dark:border-gray-700"
            >
              <ReloadIcon className="w-4 h-4 mr-2" />
              Retry
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

      {/* Status */}
      <StatusDisplay status={podcast.status} errorMessage={podcast.errorMessage} />

      {/* Metadata */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Format:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {podcast.format === 'conversation' ? 'Podcast' : 'Voice Over'}
          </span>
        </div>
        {podcast.duration && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <span className="text-gray-500 dark:text-gray-400">Duration:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatDuration(podcast.duration)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Created:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {new Date(podcast.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Audio Player */}
      {isReady && podcast.audioUrl && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Audio</h2>
          <AudioPlayer url={podcast.audioUrl} />
        </div>
      )}

      {/* Script */}
      {podcast.script && podcast.script.segments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Script</h2>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900">
            <ScriptViewer segments={podcast.script.segments} />
          </div>
        </div>
      )}

      {/* Source Documents */}
      {podcast.documents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Source Documents</h2>
          <div className="space-y-2">
            {podcast.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
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
