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
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { DocumentItem } from '@/features/documents/components/document-item';
import { UploadDocumentDialog } from '@/features/documents/components/upload-document-dialog';
import { useDocumentsOrdered } from '@/features/documents/hooks/use-document-list';
import { PodcastItem } from '@/features/podcasts/components/podcast-item';
import { usePodcastsOrdered } from '@/features/podcasts/hooks/use-podcast-list';
import { getErrorMessage } from '@/shared/lib/errors';

export const Route = createFileRoute('/_protected/dashboard')({
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(
        apiClient.documents.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.podcasts.list.queryOptions({ input: {} }),
      ),
    ]),
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
      <div className="mb-10 animate-fade-in-up">
        <p className="page-eyebrow">Overview</p>
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Quick Actions */}
      <div className="content-grid-2 mb-12">
        <button
          onClick={() => setUploadOpen(true)}
          className="action-card animate-fade-in-up stagger-1"
          aria-label="Upload Document - Add source content"
        >
          <div className="action-card-icon">
            <UploadIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="action-card-title">Upload Document</h3>
            <p className="action-card-description">Add source content</p>
          </div>
        </button>

        <button
          onClick={handleCreatePodcast}
          disabled={createPodcastMutation.isPending}
          className="action-card animate-fade-in-up stagger-2"
          aria-label="New Podcast - Generate audio content"
        >
          <div className="action-card-icon">
            {createPodcastMutation.isPending ? (
              <Spinner className="w-5 h-5" />
            ) : (
              <PlusIcon className="w-5 h-5" aria-hidden="true" />
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
      <section className="page-section animate-fade-in-up stagger-3">
        <div className="section-header">
          <div className="flex items-center gap-2.5">
            <FileTextIcon
              className="w-4 h-4 text-primary/60"
              aria-hidden="true"
            />
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
                hideDelete
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Podcasts */}
      <section className="animate-fade-in-up stagger-4">
        <div className="section-header">
          <div className="flex items-center gap-2.5">
            <SpeakerLoudIcon
              className="w-4 h-4 text-primary/60"
              aria-hidden="true"
            />
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
                hideDelete
              />
            ))}
          </div>
        )}
      </section>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
