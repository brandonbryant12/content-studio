/**
 * Data fetching hooks using TanStack Query.
 *
 * All data is fetched from the API server - no local sync layer.
 */

export {
  // Podcast hooks
  usePodcasts,
  usePodcastsOrdered,
  usePodcast,
  // Document hooks
  useDocuments,
  useDocumentsOrdered,
  useDocument,
  // Types
  type Podcast,
  type PodcastFull,
  type Document,
} from './hooks';
