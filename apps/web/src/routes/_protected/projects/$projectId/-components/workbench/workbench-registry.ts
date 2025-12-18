import type { RouterOutput } from '@repo/api/client';
import type { ComponentType } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';

// Content types supported in the workbench
export type ContentType = 'document' | 'podcast' | 'video' | 'article' | 'social' | 'graphic';

export type Document = RouterOutput['projects']['get']['documents'][number];
export type PodcastFull = RouterOutput['podcasts']['get'];

// Generic media data type - union of all media types
export type MediaData = PodcastFull; // | ArticleFull | VideoFull - add more as needed

/**
 * Common props passed to all staging components
 */
export interface StagingProps {
  projectId: string;
  selectedDocuments: Document[];
  onDocumentOrderChange: (documentIds: string[]) => void;
  onRemoveDocument: (documentId: string) => void;
  // Shared actions
  onAddSources?: () => void;
  // Edit mode support
  media?: MediaData | null;
  isEditMode: boolean;
}

/**
 * Common props passed to all commit components
 */
export interface CommitProps {
  projectId: string;
  selectedDocumentIds: string[];
  onSuccess: () => void;
  disabled: boolean;
  // Edit mode support
  media?: MediaData | null;
  isEditMode: boolean;
}

/**
 * Configuration for each media type's workbench components
 */
export interface WorkbenchConfig {
  type: ContentType;
  label: string;
  description: string;
  gradient: string;
  StagingComponent: ComponentType<StagingProps>;
  CommitComponent: ComponentType<CommitProps>;
  // For edit mode - load existing media by ID
  loadMedia?: (mediaId: string) => Promise<MediaData>;
}

/**
 * Lazy-loaded workbench configs.
 * Components are imported dynamically to enable code splitting.
 */
export async function getWorkbenchConfig(
  mediaType: string,
): Promise<WorkbenchConfig | null> {
  switch (mediaType) {
    case 'podcast': {
      const [{ PodcastStaging }, { PodcastCommit }] = await Promise.all([
        import('./podcast/podcast-staging'),
        import('./podcast/podcast-commit'),
      ]);
      return {
        type: 'podcast',
        label: 'Podcast',
        description: 'Create an AI-generated audio conversation',
        gradient: 'from-violet-500 to-fuchsia-500',
        StagingComponent: PodcastStaging,
        CommitComponent: PodcastCommit,
        loadMedia: async (mediaId: string) => {
          return queryClient.ensureQueryData(
            apiClient.podcasts.get.queryOptions({ input: { id: mediaId } }),
          );
        },
      };
    }
    // Future media types can be added here
    // case 'article': { ... }
    // case 'video': { ... }
    default:
      return null;
  }
}

/**
 * Validate that a media type has an available workbench
 */
export function isValidWorkbenchType(mediaType: string): boolean {
  return ['podcast'].includes(mediaType);
}
