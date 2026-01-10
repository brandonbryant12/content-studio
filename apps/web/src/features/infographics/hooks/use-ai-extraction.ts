// features/infographics/hooks/use-ai-extraction.ts

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import type { RouterOutput } from '@repo/api/client';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Key point suggestion from AI extraction.
 */
export type KeyPointSuggestion =
  RouterOutput['infographics']['extractKeyPoints']['suggestions'][number];

/**
 * Mutation hook for triggering AI key point extraction.
 * Shows a loading toast while extracting and success/error toasts on completion.
 */
export function useExtractKeyPoints() {
  return useMutation(
    apiClient.infographics.extractKeyPoints.mutationOptions({
      onMutate: () => {
        // Show loading toast while extracting
        toast.loading('Extracting key points...', {
          id: 'extract-key-points',
        });
      },
      onSuccess: (data) => {
        // Dismiss loading toast and show success
        toast.dismiss('extract-key-points');
        const count = data.suggestions.length;
        toast.success(
          count > 0
            ? `Found ${count} key point${count === 1 ? '' : 's'}`
            : 'No key points found in documents',
        );
      },
      onError: (error) => {
        // Dismiss loading toast and show error
        toast.dismiss('extract-key-points');
        toast.error(getErrorMessage(error, 'Failed to extract key points'));
      },
    }),
  );
}
