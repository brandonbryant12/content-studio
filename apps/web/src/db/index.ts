/**
 * TanStack DB Store
 *
 * This module provides reactive collections for podcasts and documents,
 * backed by TanStack Query for server synchronization.
 *
 * Collections provide:
 * - Automatic data fetching and caching
 * - Optimistic updates with automatic rollback
 * - Live queries that update when data changes
 * - SSE integration for real-time updates
 */

export {
  podcastCollection,
  podcastUtils,
  documentCollection,
  documentUtils,
  type Podcast,
  type PodcastFull,
  type Document,
} from './collections';

export { useSSESubscription } from './use-sse-subscription';

// Re-export useLiveQuery for convenience
export { useLiveQuery } from '@tanstack/react-db';
