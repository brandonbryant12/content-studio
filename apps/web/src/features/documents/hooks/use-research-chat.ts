import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useMemo, useCallback } from 'react';
import type { UIMessage, UIMessageChunk } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

const transport = {
  sendMessages: async (options: {
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  }) => {
    const iterator = await rawApiClient.chat.research(
      { messages: options.messages },
      { signal: options.abortSignal },
    );
    return eventIteratorToUnproxiedDataStream(
      iterator,
    ) as ReadableStream<UIMessageChunk>;
  },
  reconnectToStream: async () => null,
};

export function useResearchChat() {
  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const isStreaming = status !== 'ready';

  const canStartResearch = useMemo(
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
    canStartResearch,
    reset,
  };
}
