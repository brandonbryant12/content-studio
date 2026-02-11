import { useCallback, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseBulkDeleteOptions {
  queryKey: QueryKey;
  deleteFn: (input: { id: string }) => Promise<unknown>;
  entityName: string;
}

export interface UseBulkDeleteReturn {
  executeBulkDelete: (ids: ReadonlySet<string>) => Promise<void>;
  isBulkDeleting: boolean;
}

/**
 * Handles bulk deletion with optimistic cache removal and rollback on failure.
 * Fires all deletes in parallel via Promise.allSettled.
 */
export function useBulkDelete({
  queryKey,
  deleteFn,
  entityName,
}: UseBulkDeleteOptions): UseBulkDeleteReturn {
  const queryClient = useQueryClient();
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const executeBulkDelete = useCallback(
    async (ids: ReadonlySet<string>) => {
      if (ids.size === 0) return;
      setIsBulkDeleting(true);

      // Cancel in-flight queries and snapshot for rollback
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<readonly { id: string }[]>(queryKey);

      // Optimistically remove all selected items
      if (previous) {
        queryClient.setQueryData(
          queryKey,
          previous.filter((item) => !ids.has(item.id)),
        );
      }

      // Fire all deletes in parallel
      const results = await Promise.allSettled(
        [...ids].map((id) => deleteFn({ id })),
      );

      const failures = results.filter((r) => r.status === 'rejected');

      if (failures.length > 0) {
        // Rollback to previous state on any failure
        queryClient.setQueryData(queryKey, previous);
        const plural = entityName + (failures.length > 1 ? 's' : '');
        toast.error(`Failed to delete ${failures.length} ${plural}`);
      } else {
        const plural = entityName + (ids.size > 1 ? 's' : '');
        toast.success(`Deleted ${ids.size} ${plural}`);
      }

      setIsBulkDeleting(false);
    },
    [queryClient, queryKey, deleteFn, entityName],
  );

  return { executeBulkDelete, isBulkDeleting };
}
