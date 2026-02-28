import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useMemo, useCallback, useState } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';
import {
  CHAT_CONTROL_TOKENS,
  MAX_CHAT_FOLLOW_UPS,
  MAX_EXTENDED_FOLLOW_UPS,
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
  const [maxFollowUps, setMaxFollowUps] = useState(MAX_CHAT_FOLLOW_UPS);

  const isStreaming = status === 'submitted' || status === 'streaming';

  const automation = useMemo(
    () =>
      getChatAutomationState(messages, {
        token: CHAT_CONTROL_TOKENS.createPersona,
        isStreaming,
        maxFollowUps,
      }),
    [messages, isStreaming, maxFollowUps],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setMaxFollowUps(MAX_CHAT_FOLLOW_UPS);
  }, [setMessages]);

  const extendFollowUps = useCallback(() => {
    setMaxFollowUps((prev) => Math.min(prev + 1, MAX_EXTENDED_FOLLOW_UPS));
  }, []);

  return {
    messages,
    sendMessage,
    status,
    isStreaming,
    error,
    canCreatePersona: !isStreaming && automation.hasAssistantResponse,
    shouldAutoCreate: automation.shouldAutoTrigger,
    followUpCount: automation.assistantMessageCount,
    followUpLimit: automation.followUpLimit,
    extendFollowUps,
    reset,
  };
}
