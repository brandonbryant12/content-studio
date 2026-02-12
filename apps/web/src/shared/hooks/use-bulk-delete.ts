import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
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
      const idList = [...ids];
      const results = await Promise.allSettled(
        idList.map((id) => deleteFn({ id })),
      );

      const failedIds = new Set(
        idList.filter((_, i) => results[i]!.status === 'rejected'),
      );

      if (failedIds.size > 0) {
        // Only restore items whose deletion failed
        if (previous) {
          const successfullyDeleted = idList.filter((id) => !failedIds.has(id));
          const successfulSet = new Set(successfullyDeleted);
          queryClient.setQueryData(
            queryKey,
            previous.filter((item) => !successfulSet.has(item.id)),
          );
        }
        const plural = entityName + (failedIds.size > 1 ? 's' : '');
        toast.error(`Failed to delete ${failedIds.size} ${plural}`);
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
