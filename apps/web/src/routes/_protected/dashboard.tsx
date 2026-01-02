import {
  FileTextIcon,
  SpeakerLoudIcon,
  UploadIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { DocumentItem } from './documents/-components/document-item';
import UploadDocumentDialog from './documents/-components/upload-document';
import { PodcastItem } from './podcasts/-components/podcast-item';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/lib/errors';
import { usePodcastsOrdered, useDocumentsOrdered } from '@/db';

export const Route = createFileRoute('/_protected/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents, isLoading: docsLoading } = useDocumentsOrdered({
    limit: 5,
    orderBy: 'desc',
  });

  const { data: podcasts, isLoading: podcastsLoading } = usePodcastsOrdered({
    limit: 5,
    orderBy: 'desc',
  });

  const createPodcastMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (data) => {
        queryClient.invalidateQueries({ queryKey: ['podcasts'] });
        navigate({
          to: '/podcasts/$podcastId',
          params: { podcastId: data.id },
          search: { version: undefined },
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create podcast'));
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

        {docsLoading ? (
          <div className="loading-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : documents?.length === 0 ? (
          <div className="empty-state">
            <p className="text-body">No documents yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents?.map((doc) => (
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

        {podcastsLoading ? (
          <div className="loading-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : podcasts?.length === 0 ? (
          <div className="empty-state">
            <p className="text-body">No podcasts yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {podcasts?.map((podcast) => (
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
