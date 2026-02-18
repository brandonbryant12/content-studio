import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useMemo, useCallback } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

const transport = {
  sendMessages: async (options: {
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  }) => {
    const iterator = await rawApiClient.chat.personaChat(
      { messages: options.messages },
      { signal: options.abortSignal },
    );
    return eventIteratorToUnproxiedDataStream(iterator);
  },
  reconnectToStream: async () => null,
};

export function usePersonaChat() {
  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const isStreaming = status === 'submitted' || status === 'streaming';

  const canCreatePersona = useMemo(
    () => !isStreaming && messages.some((m) => m.role === 'assistant'),
    [isStreaming, messages],
  );

  const reset = useCallback(() => setMessages([]), [setMessages]);

  return {
    messages,
    sendMessage,
    status,
    isStreaming,
    error,
    canCreatePersona,
    reset,
  };
}
