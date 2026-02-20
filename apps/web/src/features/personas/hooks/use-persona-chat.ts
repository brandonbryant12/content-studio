import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useMemo, useCallback } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';
import {
  CHAT_CONTROL_TOKENS,
  getChatAutomationState,
} from '@/shared/lib/chat-control';

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

  const automation = useMemo(
    () =>
      getChatAutomationState(messages, {
        token: CHAT_CONTROL_TOKENS.createPersona,
        isStreaming,
      }),
    [messages, isStreaming],
  );

  const reset = useCallback(() => setMessages([]), [setMessages]);

  return {
    messages,
    sendMessage,
    status,
    isStreaming,
    error,
    canCreatePersona: !isStreaming && automation.hasAssistantResponse,
    shouldAutoCreate: automation.shouldAutoTrigger,
    followUpCount: automation.assistantMessageCount,
    reset,
  };
}
