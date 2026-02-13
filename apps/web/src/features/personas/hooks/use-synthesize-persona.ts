import { useMutation } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

export function useSynthesizePersona() {
  return useMutation({
    mutationFn: (messages: UIMessage[]) =>
      rawApiClient.chat.synthesizePersona({ messages }),
  });
}
