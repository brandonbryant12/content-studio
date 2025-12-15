import type {
  Document,
  Podcast,
  Project,
  ProjectMedia,
  ContentType,
  MediaSource,
} from '@repo/db/schema';

/**
 * Lightweight reference to a source media item.
 * Used for displaying lineage without loading full media data.
 */
export interface SourceRef {
  sourceType: ContentType;
  sourceId: string;
}

/**
 * Resolved source with full media data.
 */
export interface ResolvedSource {
  sourceType: ContentType;
  sourceId: string;
  // The resolved media (Document, Podcast, etc.) - type depends on sourceType
  media: Document | Podcast;
}

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
  /** Sources this document was derived from (e.g., transcribed from podcast) */
  sources?: SourceRef[];
}

/**
 * Podcast media item with resolved podcast data.
 */
export interface PodcastMediaItem extends BaseProjectMediaItem {
  mediaType: 'podcast';
  media: Podcast;
  /** Sources this podcast was derived from (e.g., documents used to generate) */
  sources?: SourceRef[];
}

// Future content types - add interfaces here as tables are created
// export interface VideoMediaItem extends BaseProjectMediaItem {
//   mediaType: 'video';
//   media: Video;
// }
// export interface ArticleMediaItem extends BaseProjectMediaItem {
//   mediaType: 'article';
//   media: Article;
// }
// export interface SocialMediaItem extends BaseProjectMediaItem {
//   mediaType: 'social';
//   media: Social;
// }
// export interface GraphicMediaItem extends BaseProjectMediaItem {
//   mediaType: 'graphic';
//   media: Graphic;
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
  mediaType: ContentType;
  mediaId: string;
  order?: number;
}

// Re-export types for convenience
export type {
  Project,
  ProjectMedia,
  ContentType,
  MediaSource,
} from '@repo/db/schema';
// Alias for backwards compatibility
export type MediaType = ContentType;
