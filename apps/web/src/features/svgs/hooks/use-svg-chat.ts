import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useCallback, useMemo } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { getSvgQueryKey } from './use-svg';
import { getSvgMessagesQueryKey } from './use-svg-messages';

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim();
}

export function useSvgChat(svgId: string) {
  const transport = useMemo(
    () => ({
      sendMessages: async (options: {
        messages: UIMessage[];
        abortSignal: AbortSignal | undefined;
      }) => {
        const lastUserMessage = [...options.messages]
          .reverse()
          .find((message) => message.role === 'user');

        if (!lastUserMessage) {
          throw new Error('No user message found');
        }

        const message = getMessageText(lastUserMessage);
        if (!message) {
          throw new Error('User message text is empty');
        }

        const iterator = await rawApiClient.svgs.chat(
          { id: svgId, message },
          { signal: options.abortSignal },
        );

        return eventIteratorToUnproxiedDataStream(iterator);
      },
      reconnectToStream: async () => null,
    }),
    [svgId],
  );

  const onFinish = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getSvgQueryKey(svgId) });
    void queryClient.invalidateQueries({
      queryKey: getSvgMessagesQueryKey(svgId),
    });
  }, [svgId]);

  const chat = useChat({ transport, onFinish });
  const isStreaming = chat.status === 'submitted' || chat.status === 'streaming';

  return {
    ...chat,
    isStreaming,
  };
}
