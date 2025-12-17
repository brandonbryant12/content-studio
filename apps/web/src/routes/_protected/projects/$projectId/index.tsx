import {
  ArrowLeftIcon,
  Cross2Icon,
  GearIcon,
  HamburgerMenuIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import AddMediaDialog from '../-components/add-media-dialog';
import { ContentLibrary } from '../-components/content-library';
import { ContentStudio } from '../-components/content-studio';
import CreatePodcastDialog from '../-components/create-podcast-dialog';
import UploadDocumentDialog from '../-components/upload-document-dialog';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

type ContentType = 'document' | 'podcast' | 'video' | 'article' | 'social' | 'graphic';

export const Route = createFileRoute('/_protected/projects/$projectId/')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.projects.get.queryOptions({
        input: { id: params.projectId },
      }),
    ),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();

  // Dialog states
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [createPodcastOpen, setCreatePodcastOpen] = useState(false);

  // Sidebar visibility (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Selection state for content library
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: project, isPending } = useQuery(
    apiClient.projects.get.queryOptions({ input: { id: projectId } }),
  );

  const invalidateProjectQueries = () => invalidateQueries('projects');

  const removeDocumentMutation = useMutation(
    apiClient.projects.removeDocument.mutationOptions({
      onSuccess: async () => {
        await invalidateProjectQueries();
        toast.success('Document removed from project');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to remove document');
      },
    }),
  );

  const deleteMutation = useMutation(
    apiClient.projects.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateProjectQueries();
        toast.success('Project deleted');
        navigate({ to: '/projects' });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete project');
      },
    }),
  );

  const handleCreateContent = (type: ContentType) => {
    // For now, only podcasts are supported
    if (type === 'podcast') {
      setCreatePodcastOpen(true);
    } else {
      toast.info(`${type} creation coming soon!`);
    }
  };

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-center text-gray-500 dark:text-gray-400 py-16">
          Project not found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <Cross2Icon className="w-4 h-4" />
          ) : (
            <HamburgerMenuIcon className="w-4 h-4" />
          )}
        </Button>

        <Link to="/projects" className="hidden sm:block">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {project.title}
          </h1>
          {project.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:block">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {selectedIds.size > 0 && (
            <span className="hidden sm:inline-flex text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-gray-600 hidden sm:flex"
          >
            <GearIcon className="w-4 h-4" />
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
      </header>

      {/* Main content area: Sidebar + Studio */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - fixed on mobile, static on desktop */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out
            lg:relative lg:translate-x-0 lg:z-auto
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <ContentLibrary
            documents={project.documents}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onAddExisting={() => {
              setAddDocumentOpen(true);
              setSidebarOpen(false);
            }}
            onUploadNew={() => {
              setUploadDocumentOpen(true);
              setSidebarOpen(false);
            }}
            onRemoveDocument={(documentId) =>
              removeDocumentMutation.mutate({ id: projectId, documentId })
            }
            isRemoving={removeDocumentMutation.isPending}
            removingDocumentId={removeDocumentMutation.variables?.documentId}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <ContentStudio
            projectId={projectId}
            documents={project.documents}
            outputCounts={project.outputCounts}
            selectedSourceIds={selectedIds}
            onCreateContent={handleCreateContent}
          />
        </main>
      </div>

      {/* Dialogs */}
      <AddMediaDialog
        open={addDocumentOpen}
        onOpenChange={setAddDocumentOpen}
        projectId={projectId}
        existingDocumentIds={project.documents.map((d) => d.id)}
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
        projectDocuments={project.documents}
        preSelectedDocumentIds={Array.from(selectedIds)}
      />
    </div>
  );
}
