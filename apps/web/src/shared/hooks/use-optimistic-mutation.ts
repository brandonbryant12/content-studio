// shared/hooks/use-optimistic-mutation.ts

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type MutationFunction,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errors';

export interface OptimisticMutationOptions<TData, TVariables, TCache = TData> {
  /** Query key to apply optimistic update to */
  queryKey: QueryKey;

  /** Mutation function - compatible with TanStack Query's MutationFunction */
  mutationFn: MutationFunction<TData, TVariables>;

  /** Transform current cache to optimistic state */
  getOptimisticData: (
    current: TCache | undefined,
    variables: TVariables
  ) => TCache | undefined;

  /** Success message (optional) */
  successMessage?: string | ((data: TData) => string);

  /** Error message fallback */
  errorMessage?: string;

  /** Additional onSuccess handler */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /** Show success toast (default: false, SSE provides confirmation) */
  showSuccessToast?: boolean;
}

export function useOptimisticMutation<TData, TVariables, TCache = TData>({
  queryKey,
  mutationFn,
  getOptimisticData,
  successMessage,
  errorMessage = 'Operation failed',
  onSuccess,
  showSuccessToast = false,
}: OptimisticMutationOptions<TData, TVariables, TCache>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<TCache>(queryKey);
      const optimistic = getOptimisticData(previous, variables);

      if (optimistic !== undefined) {
        queryClient.setQueryData<TCache>(queryKey, optimistic);
      }

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(error, errorMessage));
    },

    onSuccess: (data, variables) => {
      if (showSuccessToast && successMessage) {
        const message = typeof successMessage === 'function'
          ? successMessage(data)
          : successMessage;
        toast.success(message);
      }
      onSuccess?.(data, variables);
    },

    // No onSettled - SSE handles query invalidation
  });
}
