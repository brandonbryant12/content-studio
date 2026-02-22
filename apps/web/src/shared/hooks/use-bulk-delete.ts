import {
  useQueryClient,
  type QueryKey,
  type MutationFunctionContext,
} from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface UseBulkDeleteOptions {
  queryKey: QueryKey;
  deleteFn: (
    input: { id: string },
    context: MutationFunctionContext,
  ) => Promise<unknown>;
  entityName: string;
}

interface UseBulkDeleteReturn {
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

      let previous: readonly { id: string }[] | undefined;

      try {
        const mutationContext: MutationFunctionContext = {
          client: queryClient,
          meta: undefined,
        };

        // Cancel in-flight queries and snapshot for rollback
        await queryClient.cancelQueries({ queryKey });
        previous =
          queryClient.getQueryData<readonly { id: string }[]>(queryKey);

        // Optimistically remove all selected items
        if (previous) {
          queryClient.setQueryData(
            queryKey,
            previous.filter((item) => !ids.has(item.id)),
          );
        }

        // Fire all deletes in parallel. Promise.resolve() prevents sync throws
        // from escaping Promise.allSettled and skipping cleanup.
        const idList = [...ids];
        const results = await Promise.allSettled(
          idList.map((id) =>
            Promise.resolve().then(() => deleteFn({ id }, mutationContext)),
          ),
        );

        const failedIds = new Set(
          idList.filter((_, i) => results[i]!.status === 'rejected'),
        );

        if (failedIds.size > 0) {
          // Only restore items whose deletion failed
          if (previous) {
            const successfullyDeleted = idList.filter(
              (id) => !failedIds.has(id),
            );
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
      } catch {
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
        }
        const plural = entityName + (ids.size > 1 ? 's' : '');
        toast.error(`Failed to delete ${plural}`);
      } finally {
        setIsBulkDeleting(false);
      }
    },
    [queryClient, queryKey, deleteFn, entityName],
  );

  return { executeBulkDelete, isBulkDeleting };
}
