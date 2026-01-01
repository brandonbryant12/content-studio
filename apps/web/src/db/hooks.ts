/**
 * TanStack Query hooks for fetching data from the API.
 *
 * This replaces the previous TanStack DB / ElectricSQL implementation
 * with standard server-state management via TanStack Query.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';
import type { RouterOutput } from '@repo/api/client';

// Re-export types from the API for convenience
export type Podcast = RouterOutput['podcasts']['list'][number];
export type PodcastFull = RouterOutput['podcasts']['get'];
export type Document = RouterOutput['documents']['list'][number];

interface QueryOptions {
  enabled?: boolean;
}

// =============================================================================
// Podcast Queries
// =============================================================================

/**
 * Query all podcasts for the current user.
 */
export function usePodcasts(options: QueryOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    ...apiClient.podcasts.list.queryOptions({ input: {} }),
    enabled,
    select: (data) => data,
  });
}

/**
 * Query podcasts with ordering and limit.
 */
export function usePodcastsOrdered(
  options: QueryOptions & { limit?: number; orderBy?: 'asc' | 'desc' } = {},
) {
  const { limit, orderBy = 'desc', enabled = true } = options;

  return useQuery({
    ...apiClient.podcasts.list.queryOptions({ input: { limit } }),
    enabled,
    select: (data) => {
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return orderBy === 'desc' ? dateB - dateA : dateA - dateB;
      });
      return limit ? sorted.slice(0, limit) : sorted;
    },
  });
}

/**
 * Query a single podcast by ID.
 */
export function usePodcast(
  podcastId: string,
  options: QueryOptions = {},
): UseQueryResult<PodcastFull> {
  const { enabled = true } = options;

  return useQuery({
    ...apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
    enabled: enabled && !!podcastId,
  });
}

// =============================================================================
// Document Queries
// =============================================================================

/**
 * Query all documents for the current user.
 */
export function useDocuments(options: QueryOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    ...apiClient.documents.list.queryOptions({ input: {} }),
    enabled,
  });
}

/**
 * Query documents with ordering and limit.
 */
export function useDocumentsOrdered(
  options: QueryOptions & { limit?: number; orderBy?: 'asc' | 'desc' } = {},
) {
  const { limit, orderBy = 'desc', enabled = true } = options;

  return useQuery({
    ...apiClient.documents.list.queryOptions({ input: { limit } }),
    enabled,
    select: (data) => {
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return orderBy === 'desc' ? dateB - dateA : dateA - dateB;
      });
      return limit ? sorted.slice(0, limit) : sorted;
    },
  });
}

/**
 * Query a single document by ID.
 */
export function useDocument(
  documentId: string,
  options: QueryOptions = {},
): UseQueryResult<Document> {
  const { enabled = true } = options;

  return useQuery({
    ...apiClient.documents.get.queryOptions({ input: { id: documentId } }),
    enabled: enabled && !!documentId,
  });
}
