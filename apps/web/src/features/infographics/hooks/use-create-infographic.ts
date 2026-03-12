import {
  type MutationFunctionContext,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { InfographicFormat, StyleProperty } from '@repo/api/contracts';
import { getInfographicListQueryKey } from './use-infographic-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type CreateInfographicInput = {
  title?: string;
  format?: InfographicFormat;
  prompt?: string;
  styleProperties?: StyleProperty[];
  sourceId?: string;
};

const DEFAULT_INFOGRAPHIC_TITLE = 'Untitled Infographic';
const DEFAULT_INFOGRAPHIC_FORMAT: InfographicFormat = 'portrait';

export function useCreateInfographic() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = apiClient.infographics.create.mutationOptions().mutationFn!;
  type CreateInfographicOutput = Awaited<ReturnType<typeof createFn>>;

  return useMutation<
    CreateInfographicOutput,
    Error,
    CreateInfographicInput | void
  >({
    mutationFn: (variables, context: MutationFunctionContext) => {
      const input = variables ?? {};
      return createFn(
        {
          title: input.title ?? DEFAULT_INFOGRAPHIC_TITLE,
          format: input.format ?? DEFAULT_INFOGRAPHIC_FORMAT,
          prompt: input.prompt,
          styleProperties: input.styleProperties,
          sourceId: input.sourceId,
        },
        context,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: getInfographicListQueryKey(),
      });

      navigate({
        to: '/infographics/$infographicId',
        params: { infographicId: data.id },
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create infographic'));
    },
  });
}
