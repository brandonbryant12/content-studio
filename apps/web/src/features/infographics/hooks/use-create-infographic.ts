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
  title: string;
  format: InfographicFormat;
  prompt?: string;
  styleProperties?: StyleProperty[];
  documentId?: string;
  autoGenerate?: boolean;
};

export function useCreateInfographic() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const generateMutation = useMutation(
    apiClient.infographics.generate.mutationOptions(),
  );
  const createFn = apiClient.infographics.create.mutationOptions().mutationFn!;
  type CreateInfographicOutput = Awaited<ReturnType<typeof createFn>>;

  return useMutation<CreateInfographicOutput, Error, CreateInfographicInput>({
    mutationFn: (variables, context: MutationFunctionContext) =>
      createFn(
        {
          title: variables.title,
          format: variables.format,
          prompt: variables.prompt,
          styleProperties: variables.styleProperties,
          documentId: variables.documentId,
        },
        context,
      ),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getInfographicListQueryKey(),
      });

      const shouldAutoGenerate =
        variables.autoGenerate === true &&
        typeof variables.prompt === 'string' &&
        variables.prompt.trim().length > 0;

      if (shouldAutoGenerate) {
        try {
          await generateMutation.mutateAsync({ id: data.id });
          toast.success('Infographic created and generation started');
        } catch (error) {
          toast.error(
            getErrorMessage(
              error,
              'Created infographic, but failed to start generation',
            ),
          );
        }
      } else {
        toast.success('Infographic created');
      }

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
