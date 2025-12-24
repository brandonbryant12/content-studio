import { createCollection } from '@tanstack/db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { RouterOutput } from '@repo/api/client';
import { queryClient } from '@/clients/queryClient';

/**
 * Document type from API response
 */
export type Document = RouterOutput['documents']['list'][number];

/**
 * Document collection - for document list views and lookups
 */
export const documentCollection = createCollection(
  queryCollectionOptions<Document>({
    queryKey: ['documents', 'list'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SERVER_URL}${import.meta.env.VITE_PUBLIC_SERVER_API_PATH}/documents`,
        { credentials: 'include' },
      );
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    queryClient,
    getKey: (doc) => doc.id,
    staleTime: 1000 * 60, // 1 minute

    // Mutation handlers
    onDelete: async ({ transaction }) => {
      const doc = transaction.mutations[0]?.original;
      if (!doc) return;
      await fetch(
        `${import.meta.env.VITE_PUBLIC_SERVER_URL}${import.meta.env.VITE_PUBLIC_SERVER_API_PATH}/documents/${doc.id}`,
        { method: 'DELETE', credentials: 'include' },
      );
    },
  }),
);

/**
 * Enhanced document utilities that handle both collection and query cache
 */
export const documentUtils = {
  ...documentCollection.utils,
  /**
   * Refetch document data and invalidate all document queries.
   * Use this after mutations that affect document data.
   */
  refetch: async () => {
    await Promise.all([
      documentCollection.utils.refetch(),
      // Invalidate all document queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === 'documents';
        },
      }),
    ]);
  },
};
