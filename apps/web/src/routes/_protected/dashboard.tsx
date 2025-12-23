import {
  FileTextIcon,
  SpeakerLoudIcon,
  UploadIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { DocumentItem } from './documents/-components/document-item';
import UploadDocumentDialog from './documents/-components/upload-document';
import { PodcastItem } from './podcasts/-components/podcast-item';
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
        navigate({
          to: '/podcasts/$podcastId',
          params: { podcastId: data.id },
        });
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
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <p className="page-eyebrow">Overview</p>
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Quick Actions */}
      <div className="content-grid-2 mb-10">
        <button onClick={() => setUploadOpen(true)} className="action-card">
          <div className="action-card-icon">
            <UploadIcon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="action-card-title">Upload Document</h3>
            <p className="action-card-description">Add source content</p>
          </div>
        </button>

        <button
          onClick={handleCreatePodcast}
          disabled={createPodcastMutation.isPending}
          className="action-card"
        >
          <div className="action-card-icon">
            {createPodcastMutation.isPending ? (
              <Spinner className="w-5 h-5" />
            ) : (
              <PlusIcon className="w-5 h-5 text-foreground" />
            )}
          </div>
          <div>
            <h3 className="action-card-title">
              {createPodcastMutation.isPending ? 'Creating...' : 'New Podcast'}
            </h3>
            <p className="action-card-description">Generate audio content</p>
          </div>
        </button>
      </div>

      {/* Recent Documents */}
      <section className="page-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <FileTextIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="section-title">Recent Documents</h2>
          </div>
          <Link to="/documents" className="text-link">
            View all
          </Link>
        </div>

        {docsPending ? (
          <div className="loading-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : documents?.length === 0 ? (
          <div className="empty-state">
            <p className="text-body">No documents yet</p>
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
        <div className="section-header">
          <div className="flex items-center gap-2">
            <SpeakerLoudIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="section-title">Recent Podcasts</h2>
          </div>
          <Link to="/podcasts" className="text-link">
            View all
          </Link>
        </div>

        {podcastsPending ? (
          <div className="loading-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : podcasts?.length === 0 ? (
          <div className="empty-state">
            <p className="text-body">No podcasts yet</p>
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
