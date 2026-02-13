import { useMutation } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

export function useSynthesizeResearch() {
  return useMutation({
    mutationFn: (messages: UIMessage[]) =>
      rawApiClient.chat.synthesizeResearchQuery({ messages }),
  });
}
