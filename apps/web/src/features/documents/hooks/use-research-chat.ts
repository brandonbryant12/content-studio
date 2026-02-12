import { useChat } from '@ai-sdk/react';
import type { UIMessage, UIMessageChunk } from 'ai';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useMemo, useCallback } from 'react';
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

  const refinedQuery = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (!lastAssistant) return null;
    const text = lastAssistant.parts
      .filter(
        (p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text',
      )
      .map((p) => p.text)
      .join('');
    const match = text.match(/\*\*Refined Research Query:\*\*\s*([\s\S]+)/);
    return match?.[1]?.trim() ?? null;
  }, [messages]);

  const isStreaming = status !== 'ready';
  const reset = useCallback(() => setMessages([]), [setMessages]);

  return {
    messages,
    sendMessage,
    status,
    isStreaming,
    error,
    refinedQuery,
    reset,
  };
}
