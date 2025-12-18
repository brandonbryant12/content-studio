import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import type { RouterOutput } from '@repo/api/client';
import {
  getWorkbenchConfig,
  isValidWorkbenchType,
  type WorkbenchConfig,
  type MediaData,
} from '../../-components/workbench/workbench-registry';
import { WorkbenchShell } from '../../-components/workbench/workbench-shell';
import AddMediaDialog from '../../../-components/add-media-dialog';
import UploadDocumentDialog from '../../../-components/upload-document-dialog';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';

type ProjectData = RouterOutput['projects']['get'];

export interface LoaderData {
  project: ProjectData;
  config: WorkbenchConfig;
  media: MediaData | null;
  isEditMode: boolean;
}

export const Route = createFileRoute(
  '/_protected/projects/$projectId/$mediaType/$mediaId/',
)({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      docs: (search.docs as string) || '',
    };
  },
  loader: async ({ params }): Promise<LoaderData> => {
    const { projectId, mediaType, mediaId } = params as {
      projectId: string;
      mediaType: string;
      mediaId: string;
    };

    // Validate media type
    if (!isValidWorkbenchType(mediaType)) {
      throw new Error(`Invalid media type: ${mediaType}`);
    }

    // Load project data
    const project = await queryClient.ensureQueryData(
      apiClient.projects.get.queryOptions({
        input: { id: projectId },
      }),
    );

    // Load workbench config
    const config = await getWorkbenchConfig(mediaType);
    if (!config) {
      throw new Error(`Workbench not available for: ${mediaType}`);
    }

    // Determine mode: "new" = create, otherwise = edit
    const isEditMode = mediaId !== 'new';
    let media: MediaData | null = null;

    // Load existing media in edit mode
    if (isEditMode && config.loadMedia) {
      try {
        media = await config.loadMedia(mediaId);
      } catch (error) {
        throw new Error(`Failed to load ${mediaType}: ${(error as Error).message}`);
      }
    }

    return { project, config, media, isEditMode };
  },
  component: MediaWorkbenchPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-full">
      <Spinner className="w-8 h-8" />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Workbench Unavailable
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error.message}
        </p>
        <Link to="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    </div>
  ),
});

function MediaWorkbenchPage() {
  const params = Route.useParams() as {
    projectId: string;
    mediaType: string;
    mediaId: string;
  };
  const search = Route.useSearch() as { docs: string };
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData() as LoaderData;

  const { projectId, mediaId } = params;
  const initialDocs = search.docs;

  // Dialog states
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);

  // Selected document IDs (ordered array)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const { isEditMode, media, config } = loaderData;

  // Initialize selection from URL params (create mode) or media documents (edit mode)
  useEffect(() => {
    if (isEditMode && media) {
      // In edit mode, initialize with the media's documents
      const mediaWithDocs = media as { documents?: { id: string }[] };
      if (mediaWithDocs.documents) {
        setSelectedDocumentIds(mediaWithDocs.documents.map((d) => d.id));
      }
    } else if (initialDocs) {
      // In create mode, use URL params
      const docIds = initialDocs.split(',').filter(Boolean);
      setSelectedDocumentIds(docIds);
    }
  }, [isEditMode, media, initialDocs]);

  // Fetch fresh project data
  const { data: project } = useQuery(
    apiClient.projects.get.queryOptions({ input: { id: projectId } }),
  );

  // Fetch fresh media data in edit mode (for polling/updates)
  const { data: freshMedia } = useQuery({
    ...apiClient.podcasts.get.queryOptions({ input: { id: mediaId } }),
    enabled: isEditMode && config.type === 'podcast',
    refetchInterval: (data) => {
      // Poll while generating
      const status = data?.state?.data?.status;
      if (status === 'generating_script' || status === 'generating_audio') {
        return 3000; // Poll every 3 seconds
      }
      return false;
    },
  });

  const currentProject = project ?? loaderData.project;
  const currentMedia = isEditMode ? (freshMedia ?? media) : null;

  const handleSuccess = () => {
    // In edit mode, stay on the page to show results
    // In create mode, navigate to project page or optionally to the new media
    if (!isEditMode) {
      navigate({
        to: '/projects/$projectId',
        params: { projectId },
      });
    }
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Project not found</p>
      </div>
    );
  }

  return (
    <>
      <WorkbenchShell
        projectId={projectId}
        projectTitle={currentProject.title}
        mediaTypeLabel={config.label}
        gradient={config.gradient}
        documents={currentProject.documents}
        selectedDocumentIds={selectedDocumentIds}
        onSelectionChange={setSelectedDocumentIds}
        onAddExisting={() => setAddDocumentOpen(true)}
        onUploadNew={() => setUploadDocumentOpen(true)}
        StagingComponent={config.StagingComponent}
        CommitComponent={config.CommitComponent}
        onSuccess={handleSuccess}
        media={currentMedia}
        isEditMode={isEditMode}
      />

      {/* Dialogs - only show in create mode */}
      {!isEditMode && (
        <>
          <AddMediaDialog
            open={addDocumentOpen}
            onOpenChange={setAddDocumentOpen}
            projectId={projectId}
            existingDocumentIds={currentProject.documents.map((d) => d.id)}
          />

          <UploadDocumentDialog
            open={uploadDocumentOpen}
            onOpenChange={setUploadDocumentOpen}
            projectId={projectId}
          />
        </>
      )}
    </>
  );
}
