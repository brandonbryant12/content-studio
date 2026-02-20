import type { UIMessage } from 'ai';

export const isStreamingAssistantMessage = (
  messages: readonly UIMessage[],
  message: UIMessage,
  index: number,
  isStreaming: boolean,
): boolean =>
  isStreaming &&
  message.role === 'assistant' &&
  index === messages.length - 1;
