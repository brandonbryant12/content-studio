import type { UIMessage } from 'ai';

export const CHAT_CONTROL_TOKENS = {
  startResearch: '[[START_RESEARCH]]',
  createPersona: '[[CREATE_PERSONA]]',
} as const;

export const MAX_CHAT_FOLLOW_UPS = 2;

const CONTROL_TOKEN_PATTERN = /\[\[(START_RESEARCH|CREATE_PERSONA)\]\]/g;

export function stripChatControlTokens(text: string) {
  return text.replace(CONTROL_TOKEN_PATTERN, '').trim();
}

export function getMessageText(message: UIMessage) {
  return message.parts
    .filter(
      (
        part,
      ): part is Extract<(typeof message.parts)[number], { type: 'text' }> =>
        part.type === 'text',
    )
    .map((part) => part.text)
    .join('');
}

export const MAX_EXTENDED_FOLLOW_UPS = 4;

export interface ChatAutomationState {
  readonly assistantMessageCount: number;
  readonly followUpLimit: number;
  readonly hasAssistantResponse: boolean;
  readonly hasControlToken: boolean;
  readonly shouldAutoTrigger: boolean;
}

export interface ChatAutomationOptions {
  readonly token: string;
  readonly isStreaming: boolean;
  readonly maxFollowUps?: number;
}

export function getChatAutomationState(
  messages: readonly UIMessage[],
  options: ChatAutomationOptions,
): ChatAutomationState {
  const assistantMessages = messages.filter((message) => {
    if (message.role !== 'assistant') return false;
    return getMessageText(message).trim().length > 0;
  });

  const assistantMessageCount = assistantMessages.filter(
    (message) => stripChatControlTokens(getMessageText(message)).length > 0,
  ).length;
  const hasAssistantResponse = assistantMessages.length > 0;
  const hasControlToken = assistantMessages.some((message) =>
    getMessageText(message).includes(options.token),
  );

  const followUpLimit = options.maxFollowUps ?? MAX_CHAT_FOLLOW_UPS;
  const shouldAutoTrigger =
    !options.isStreaming &&
    hasAssistantResponse &&
    (hasControlToken || assistantMessageCount >= followUpLimit);

  return {
    assistantMessageCount,
    followUpLimit,
    hasAssistantResponse,
    hasControlToken,
    shouldAutoTrigger,
  };
}
