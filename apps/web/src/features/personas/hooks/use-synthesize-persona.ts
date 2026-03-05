import { useMutation } from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

export type PersonaSynthesis = RouterOutput['chat']['synthesizePersona'];

export function useSynthesizePersona() {
  return useMutation({
    mutationFn: (messages: UIMessage[]) =>
      rawApiClient.chat.synthesizePersona({ messages }),
  });
}
