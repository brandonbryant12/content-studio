import { ArrowLeftIcon, PlayIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AudioPlayer } from './-components/audio-player';
import { PodcastIcon } from './-components/podcast-icon';
import { ScriptViewer } from './-components/script-viewer';
import { getStatusConfig, isGeneratingStatus } from './-constants/status';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';
import { formatDuration } from '@/lib/formatters';

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastDetailPage,
});

function PodcastDetailPage() {
  const { podcastId } = Route.useParams();
  const navigate = useNavigate();

  const { data: podcast, isPending } = useQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: async () => {
        toast.success('Podcast deleted');
        navigate({ to: '/podcasts' });
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete podcast');
      },
    }),
  );

  const generateScriptMutation = useMutation(
    apiClient.podcasts.generateScript.mutationOptions({
      onSuccess: async () => {
        toast.success('Script generation started');
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start script generation');
      },
    }),
  );

  const generateAudioMutation = useMutation(
    apiClient.podcasts.generateAudio.mutationOptions({
      onSuccess: async () => {
        toast.success('Audio generation started');
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start audio generation');
      },
    }),
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Podcast not found
        </h2>
        <Link
          to="/podcasts"
          className="mt-4 text-violet-600 dark:text-violet-400 hover:underline"
        >
          Back to Podcasts
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(podcast.status);
  const isGenerating = isGeneratingStatus(podcast.status);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link
          to="/podcasts"
          className="mt-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <PodcastIcon format={podcast.format} status={podcast.status} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {podcast.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={statusConfig.badgeVariant} className="gap-1.5">
              {isGenerating && <Spinner className="w-3 h-3" />}
              {statusConfig.label}
            </Badge>
            <Badge variant="default">
              {podcast.format === 'conversation' ? 'Podcast' : 'Voice Over'}
            </Badge>
            {podcast.duration && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDuration(podcast.duration)}
              </span>
            )}
          </div>

          {podcast.description && (
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              {podcast.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {podcast.status === 'draft' && (
            <Button
              onClick={() => generateScriptMutation.mutate({ id: podcast.id })}
              disabled={generateScriptMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {generateScriptMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Generate Script
                </>
              )}
            </Button>
          )}

          {podcast.status === 'script_ready' && (
            <Button
              onClick={() => generateAudioMutation.mutate({ id: podcast.id })}
              disabled={generateAudioMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {generateAudioMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Generate Audio
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate({ id: podcast.id })}
            disabled={deleteMutation.isPending || isGenerating}
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

      {/* Audio Player */}
      {podcast.audioUrl && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Audio
          </h2>
          <AudioPlayer url={podcast.audioUrl} />
        </section>
      )}

      {/* Script */}
      {podcast.script && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Script
          </h2>
          <ScriptViewer
            segments={podcast.script.segments}
            summary={podcast.script.summary}
          />
        </section>
      )}

      {/* Source Documents */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Source Documents
        </h2>
        {podcast.documents.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No source documents</p>
        ) : (
          <div className="space-y-2">
            {podcast.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) || 'DOC'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {doc.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {doc.wordCount.toLocaleString()} words
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Error Message */}
      {podcast.status === 'failed' && podcast.errorMessage && (
        <section className="mt-8">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <h3 className="font-medium text-red-800 dark:text-red-200 mb-1">
              Generation Failed
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300">
              {podcast.errorMessage}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
