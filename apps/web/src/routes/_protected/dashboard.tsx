import { FileTextIcon, SpeakerLoudIcon, UploadIcon, PlusIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { DocumentItem } from './documents/-components/document-item';
import { PodcastItem } from './podcasts/-components/podcast-item';
import UploadDocumentDialog from './documents/-components/upload-document';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';

export const Route = createFileRoute('/_protected/dashboard')({
  loader: async () => {
    await Promise.all([
      queryClient.ensureQueryData(
        apiClient.documents.list.queryOptions({ input: { limit: 5 } }),
      ),
      queryClient.ensureQueryData(
        apiClient.podcasts.list.queryOptions({ input: { limit: 5 } }),
      ),
    ]);
  },
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents, isPending: docsPending } = useQuery(
    apiClient.documents.list.queryOptions({ input: { limit: 5 } }),
  );

  const { data: podcasts, isPending: podcastsPending } = useQuery(
    apiClient.podcasts.list.queryOptions({ input: { limit: 5 } }),
  );

  const createPodcastMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (data) => {
        navigate({ to: '/podcasts/$podcastId', params: { podcastId: data.id } });
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

  const handleCreatePodcast = () => {
    createPodcastMutation.mutate({
      title: 'Untitled Podcast',
      format: 'conversation',
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your content overview and quick actions
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-105 transition-transform">
            <UploadIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Upload Document
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add source content for podcasts
            </p>
          </div>
        </button>

        <button
          onClick={handleCreatePodcast}
          disabled={createPodcastMutation.isPending}
          className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 hover:border-violet-300 dark:hover:border-violet-700 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center group-hover:scale-105 transition-transform">
            {createPodcastMutation.isPending ? (
              <Spinner className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            ) : (
              <PlusIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            )}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {createPodcastMutation.isPending ? 'Creating...' : 'Create Podcast'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generate audio from documents
            </p>
          </div>
        </button>
      </div>

      {/* Recent Documents */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Documents
            </h2>
          </div>
          <Link
            to="/documents"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            View all
          </Link>
        </div>

        {docsPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="w-5 h-5" />
          </div>
        ) : documents?.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No documents yet. Upload your first document to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents?.slice(0, 3).map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                onDelete={() => {}}
                isDeleting={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Podcasts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SpeakerLoudIcon className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Podcasts
            </h2>
          </div>
          <Link
            to="/podcasts"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            View all
          </Link>
        </div>

        {podcastsPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="w-5 h-5" />
          </div>
        ) : podcasts?.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No podcasts yet. Create your first podcast from a document.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {podcasts?.slice(0, 3).map((podcast) => (
              <PodcastItem
                key={podcast.id}
                podcast={podcast}
                onDelete={() => {}}
                isDeleting={false}
              />
            ))}
          </div>
        )}
      </section>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
