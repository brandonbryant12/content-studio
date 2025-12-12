import type {
  Document,
  Podcast,
  Project,
  ProjectMedia,
  MediaType,
} from '@repo/db/schema';

/**
 * Base interface for a media item linked to a project.
 * Includes the junction table fields plus the resolved media.
 */
export interface BaseProjectMediaItem {
  id: string;
  projectId: string;
  mediaId: string;
  order: number;
  createdAt: Date;
}

/**
 * Document media item with resolved document data.
 */
export interface DocumentMediaItem extends BaseProjectMediaItem {
  mediaType: 'document';
  media: Document;
}

/**
 * Podcast media item with resolved podcast data.
 */
export interface PodcastMediaItem extends BaseProjectMediaItem {
  mediaType: 'podcast';
  media: Podcast;
}

// Future: Add more media types here
// export interface GraphicMediaItem extends BaseProjectMediaItem {
//     mediaType: 'graphic';
//     media: Graphic;
// }

/**
 * Discriminated union of all media item types.
 * Use type guards (isDocumentMedia, isPodcastMedia) for narrowing.
 */
export type ProjectMediaItem = DocumentMediaItem | PodcastMediaItem;

/**
 * Type guard to check if a media item is a document.
 */
export function isDocumentMedia(
  item: ProjectMediaItem,
): item is DocumentMediaItem {
  return item.mediaType === 'document';
}

/**
 * Type guard to check if a media item is a podcast.
 */
export function isPodcastMedia(
  item: ProjectMediaItem,
): item is PodcastMediaItem {
  return item.mediaType === 'podcast';
}

/**
 * Project with resolved media items (polymorphic).
 */
export interface ProjectWithMedia extends Project {
  media: ProjectMediaItem[];
}

/**
 * Input for adding media to a project.
 */
export interface AddMediaInput {
  mediaType: MediaType;
  mediaId: string;
  order?: number;
}

// Re-export types for convenience
export type { Project, ProjectMedia, MediaType } from '@repo/db/schema';
