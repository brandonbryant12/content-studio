import {
  ArrowLeftIcon,
  ChevronDownIcon,
  FileTextIcon,
  PlusIcon,
  SpeakerLoudIcon,
  TrashIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import AddMediaDialog from '../-components/add-media-dialog';
import CreatePodcastDialog from '../-components/create-podcast-dialog';
import UploadDocumentDialog from '../-components/upload-document-dialog';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

export const Route = createFileRoute('/_protected/projects/$projectId/')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.projects.getWithMedia.queryOptions({
        input: { id: params.projectId },
      }),
    ),
  component: ProjectDetailPage,
});

type MediaItem = RouterOutput['projects']['getWithMedia']['media'][number];

function MediaIcon({ type }: { type: 'document' | 'podcast' }) {
  if (type === 'document') {
    return (
      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
        <FileTextIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
      <SpeakerLoudIcon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
    </div>
  );
}

function MediaItemCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: MediaItem;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const title = item.media.title;
  const subtitle =
    item.mediaType === 'document'
      ? `${item.media.wordCount.toLocaleString()} words`
      : item.media.status === 'ready'
        ? 'Ready'
        : item.media.status;

  const isPodcast = item.mediaType === 'podcast';

  const content = (
    <>
      <MediaIcon type={item.mediaType} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {title}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
          {item.mediaType} &middot; {subtitle}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        disabled={isRemoving}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
      >
        {isRemoving ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <TrashIcon className="w-4 h-4" />
        )}
      </Button>
    </>
  );

  if (isPodcast) {
    return (
      <Link
        to="/podcasts/$podcastId"
        params={{ podcastId: item.mediaId }}
        className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      {content}
    </div>
  );
}

function EmptyMedia({
  onAddDocument,
  onCreatePodcast,
}: {
  onAddDocument: () => void;
  onCreatePodcast: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mb-4">
        <PlusIcon className="w-6 h-6 text-violet-500" />
      </div>
      <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
        No media yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
        Add documents to use as source material, then create podcasts from them.
      </p>
      <div className="flex gap-2">
        <Button onClick={onAddDocument} variant="outline">
          <FileTextIcon className="w-4 h-4 mr-2" />
          Add Document
        </Button>
        <Button onClick={onCreatePodcast} variant="outline">
          <SpeakerLoudIcon className="w-4 h-4 mr-2" />
          Create Podcast
        </Button>
      </div>
    </div>
  );
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [createPodcastOpen, setCreatePodcastOpen] = useState(false);

  const { data: project, isPending } = useQuery(
    apiClient.projects.getWithMedia.queryOptions({ input: { id: projectId } }),
  );

  const invalidateProjects = () =>
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === 'projects',
    });

  const removeMediaMutation = useMutation(
    apiClient.projects.removeMedia.mutationOptions({
      onSuccess: async () => {
        await invalidateProjects();
        toast.success('Media removed from project');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to remove media');
      },
    }),
  );

  const deleteMutation = useMutation(
    apiClient.projects.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateProjects();
        toast.success('Project deleted');
        navigate({ to: '/projects' });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete project');
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

  if (!project) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl">
        <p className="text-center text-gray-500 dark:text-gray-400 py-16">
          Project not found.
        </p>
      </div>
    );
  }

  const documents = project.media.filter((m) => m.mediaType === 'document');
  const podcasts = project.media.filter((m) => m.mediaType === 'podcast');

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="shrink-0 mt-1">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {project.title}
          </h1>
          {project.description && (
            <p className="text-gray-500 dark:text-gray-400">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileTextIcon className="w-4 h-4 mr-2" />
                Add Document
                <ChevronDownIcon className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setUploadDocumentOpen(true)}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload New
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddDocumentOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Existing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => setCreatePodcastOpen(true)}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
          >
            <SpeakerLoudIcon className="w-4 h-4 mr-2" />
            Create Podcast
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate({ id: projectId })}
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

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm mb-8">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Documents:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {documents.length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Podcasts:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {podcasts.length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Created:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Media Content */}
      {project.media.length === 0 ? (
        <EmptyMedia
          onAddDocument={() => setAddDocumentOpen(true)}
          onCreatePodcast={() => setCreatePodcastOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {/* Documents Section */}
          {documents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FileTextIcon className="w-5 h-5 text-blue-500" />
                Documents ({documents.length})
              </h2>
              <div className="space-y-3">
                {documents.map((item) => (
                  <MediaItemCard
                    key={item.id}
                    item={item}
                    onRemove={() =>
                      removeMediaMutation.mutate({
                        id: projectId,
                        mediaId: item.id,
                      })
                    }
                    isRemoving={
                      removeMediaMutation.isPending &&
                      removeMediaMutation.variables?.mediaId === item.id
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Podcasts Section */}
          {podcasts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <SpeakerLoudIcon className="w-5 h-5 text-violet-500" />
                Podcasts ({podcasts.length})
              </h2>
              <div className="space-y-3">
                {podcasts.map((item) => (
                  <MediaItemCard
                    key={item.id}
                    item={item}
                    onRemove={() =>
                      removeMediaMutation.mutate({
                        id: projectId,
                        mediaId: item.id,
                      })
                    }
                    isRemoving={
                      removeMediaMutation.isPending &&
                      removeMediaMutation.variables?.mediaId === item.id
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <AddMediaDialog
        open={addDocumentOpen}
        onOpenChange={setAddDocumentOpen}
        projectId={projectId}
        existingMediaIds={project.media.map((m) => m.mediaId)}
      />

      <UploadDocumentDialog
        open={uploadDocumentOpen}
        onOpenChange={setUploadDocumentOpen}
        projectId={projectId}
      />

      <CreatePodcastDialog
        open={createPodcastOpen}
        onOpenChange={setCreatePodcastOpen}
        projectId={projectId}
        projectDocuments={
          documents as ((typeof documents)[number] & {
            mediaType: 'document';
          })[]
        }
      />
    </div>
  );
}
