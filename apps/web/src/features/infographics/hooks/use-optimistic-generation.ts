// features/infographics/hooks/use-optimistic-generation.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { InfographicStatus } from '@repo/db/schema';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { getInfographicQueryKey } from './use-infographic';

type Infographic = RouterOutput['infographics']['get'];

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Extract mutationFn from oRPC options (always defined for mutations)
const generateMutationFn =
  apiClient.infographics.generate.mutationOptions().mutationFn!;

const POLL_INTERVAL_MS = 2000;

export interface UseOptimisticGenerationReturn {
  generate: (feedbackInstructions?: string) => void;
  isGenerating: boolean;
  progress: JobStatus | null;
  error: string | null;
}

/**
 * Optimistic mutation for infographic generation with job status polling.
 *
 * Features:
 * - Optimistic update: immediately sets status to 'generating' and clears imageUrl
 * - Polls job status every 2 seconds until completed/failed
 * - On success: invalidates infographic query to get new imageUrl
 * - On error: rolls back to previous state
 * - Cleanup: stops polling on unmount
 */
export function useOptimisticGeneration(
  infographicId: string,
): UseOptimisticGenerationReturn {
  const queryClient = useQueryClient();
  const queryKey = getInfographicQueryKey(infographicId);

  // Polling state
  const [progress, setProgress] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const previousDataRef = useRef<Infographic | undefined>(undefined);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      // Don't poll if job changed or component unmounted
      if (currentJobIdRef.current !== jobId) {
        return;
      }

      try {
        const jobResult = await queryClient.fetchQuery(
          apiClient.infographics.getJob.queryOptions({ input: { jobId } }),
        );

        // Check again after async call
        if (currentJobIdRef.current !== jobId) {
          return;
        }

        setProgress(jobResult.status);

        if (jobResult.status === 'completed') {
          // Success - invalidate query to get new imageUrl
          currentJobIdRef.current = null;
          previousDataRef.current = undefined;
          await queryClient.invalidateQueries({ queryKey });
          toast.success('Infographic generated');
        } else if (jobResult.status === 'failed') {
          // Failed - rollback to previous state
          currentJobIdRef.current = null;
          const errorMsg = jobResult.error ?? 'Generation failed';
          setError(errorMsg);

          if (previousDataRef.current !== undefined) {
            queryClient.setQueryData<Infographic>(
              queryKey,
              previousDataRef.current,
            );
          }
          previousDataRef.current = undefined;

          toast.error(errorMsg);
        } else {
          // Still processing - continue polling
          pollingTimeoutRef.current = setTimeout(() => {
            pollJobStatus(jobId);
          }, POLL_INTERVAL_MS);
        }
      } catch (pollError) {
        // Check if job changed during error
        if (currentJobIdRef.current !== jobId) {
          return;
        }

        // Polling error - stop polling and show error
        currentJobIdRef.current = null;
        const errorMsg = getErrorMessage(pollError, 'Failed to check job status');
        setError(errorMsg);

        if (previousDataRef.current !== undefined) {
          queryClient.setQueryData<Infographic>(
            queryKey,
            previousDataRef.current,
          );
        }
        previousDataRef.current = undefined;

        toast.error(errorMsg);
      }
    },
    [queryClient, queryKey],
  );

  // Generation mutation
  const mutation = useMutation({
    mutationFn: generateMutationFn,

    onMutate: async () => {
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey });

      // Stop any existing polling
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      currentJobIdRef.current = null;

      // Reset state
      setProgress('pending');
      setError(null);

      // Save previous data for rollback
      const previous = queryClient.getQueryData<Infographic>(queryKey);
      previousDataRef.current = previous;

      // Optimistic update: set status to generating, clear imageUrl
      if (previous) {
        queryClient.setQueryData<Infographic>(queryKey, {
          ...previous,
          status: InfographicStatus.GENERATING,
          imageUrl: null,
        });
      }

      return { previous };
    },

    onError: (mutationError, _variables, context) => {
      // Rollback to previous state
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      previousDataRef.current = undefined;
      setProgress(null);
      setError(getErrorMessage(mutationError, 'Failed to start generation'));
      toast.error(getErrorMessage(mutationError, 'Failed to start generation'));
    },

    onSuccess: (data) => {
      // Start polling for job status
      currentJobIdRef.current = data.jobId;
      setProgress('pending');
      pollJobStatus(data.jobId);
    },

    // No onSettled - SSE handles cache invalidation after job completion
  });

  const generate = useCallback(
    (feedbackInstructions?: string) => {
      mutation.mutate({
        id: infographicId,
        feedbackInstructions,
      });
    },
    [mutation, infographicId],
  );

  const isGenerating =
    mutation.isPending ||
    progress === 'pending' ||
    progress === 'processing';

  return {
    generate,
    isGenerating,
    progress,
    error,
  };
}
