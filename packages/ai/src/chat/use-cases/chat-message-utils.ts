import type { UIMessage } from 'ai';

export const CHAT_CONTROL_TOKENS = {
  startResearch: '[[START_RESEARCH]]',
  createPersona: '[[CREATE_PERSONA]]',
} as const;

const CONTROL_TOKEN_PATTERN = /\[\[(START_RESEARCH|CREATE_PERSONA)\]\]/g;

interface MessageEntry {
  readonly role: UIMessage['role'];
  readonly text: string;
}

export interface SynthesisFormatOptions {
  readonly maxMessages: number;
  readonly maxCharsPerMessage: number;
  readonly maxTotalChars: number;
}

export const PRIMARY_SYNTHESIS_FORMAT_OPTIONS: SynthesisFormatOptions = {
  maxMessages: 24,
  maxCharsPerMessage: 700,
  maxTotalChars: 12_000,
};

export const FALLBACK_SYNTHESIS_FORMAT_OPTIONS: SynthesisFormatOptions = {
  maxMessages: 10,
  maxCharsPerMessage: 300,
  maxTotalChars: 4_000,
};

export function normalizeStringWithFallback(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

const DEFAULT_SYNTHESIS_FORMAT_OPTIONS: SynthesisFormatOptions = {
  maxMessages: 18,
  maxCharsPerMessage: 700,
  maxTotalChars: 12_000,
};

function roleLabel(role: UIMessage['role']) {
  return role === 'user' ? 'User' : 'Assistant';
}

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3)}...`;
}

function selectSynthesisEntries(
  entries: readonly MessageEntry[],
  maxMessages: number,
) {
  if (entries.length <= maxMessages) return entries;

  const firstUserEntry = entries.find((entry) => entry.role === 'user');
  const tail = entries.slice(-(maxMessages - 1));

  if (!firstUserEntry) return entries.slice(-maxMessages);
  if (tail.includes(firstUserEntry)) return tail;

  return [firstUserEntry, ...tail];
}

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
    .map((part) => stripChatControlTokens(part.text))
    .join('')
    .trim();
}

export function formatMessagesForSynthesis(
  messages: readonly UIMessage[],
  options: Partial<SynthesisFormatOptions> = {},
) {
  const config: SynthesisFormatOptions = {
    ...DEFAULT_SYNTHESIS_FORMAT_OPTIONS,
    ...options,
  };

  const entries = messages
    .map((message) => {
      const text = getMessageText(message);
      if (!text) return null;

      return {
        role: message.role,
        text: truncateText(text, config.maxCharsPerMessage),
      } satisfies MessageEntry;
    })
    .filter((entry): entry is MessageEntry => entry !== null);

  if (entries.length === 0) return 'User: Please infer intent from context.';

  const selected = selectSynthesisEntries(entries, config.maxMessages);
  const formatted = selected
    .map((entry) => `${roleLabel(entry.role)}: ${entry.text}`)
    .join('\n\n');

  if (formatted.length <= config.maxTotalChars) return formatted;
  return formatted.slice(-config.maxTotalChars);
}

export function buildSynthesisPrompts(messages: readonly UIMessage[]) {
  return {
    primary: formatMessagesForSynthesis(
      messages,
      PRIMARY_SYNTHESIS_FORMAT_OPTIONS,
    ),
    fallback: formatMessagesForSynthesis(
      messages,
      FALLBACK_SYNTHESIS_FORMAT_OPTIONS,
    ),
  };
}
