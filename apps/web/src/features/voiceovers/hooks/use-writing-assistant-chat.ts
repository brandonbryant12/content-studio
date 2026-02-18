import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useCallback } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

const transport = {
  sendMessages: async (options: {
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  }) => {
    const iterator = await rawApiClient.chat.writingAssistant(
      { messages: options.messages },
      { signal: options.abortSignal },
    );
    return eventIteratorToUnproxiedDataStream(iterator);
  },
  reconnectToStream: async () => null,
};

export function useWritingAssistantChat() {
  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const isStreaming = status === 'submitted' || status === 'streaming';
  const reset = useCallback(() => setMessages([]), [setMessages]);

  return {
    messages,
    sendMessage,
    status,
    isStreaming,
    error,
    reset,
  };
}
