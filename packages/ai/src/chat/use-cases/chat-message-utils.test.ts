import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  buildSynthesisPrompts,
  formatMessagesForSynthesis,
  getMessageText,
  normalizeStringWithFallback,
  stripChatControlTokens,
} from './chat-message-utils';

const makeMessage = (
  id: string,
  role: UIMessage['role'],
  text: string,
): UIMessage => ({
  id,
  role,
  parts: [{ type: 'text', text }],
});

describe('chat message utils', () => {
  it('strips control tokens and joins text parts', () => {
    expect(stripChatControlTokens('Ready [[CREATE_PERSONA]] now')).toBe(
      'Ready  now',
    );

    expect(
      getMessageText(
        makeMessage('m1', 'assistant', 'Ready [[START_RESEARCH]]'),
      ),
    ).toBe('Ready');
  });

  it('keeps the first user message and most recent tail when truncating', () => {
    const messages = Array.from({ length: 6 }, (_, index) =>
      makeMessage(
        `m-${index}`,
        index % 2 === 0 ? 'user' : 'assistant',
        `Message ${index}`,
      ),
    );

    const formatted = formatMessagesForSynthesis(messages, {
      maxMessages: 3,
      maxCharsPerMessage: 50,
      maxTotalChars: 500,
    });

    expect(formatted).toContain('User: Message 0');
    expect(formatted).toContain('User: Message 4');
    expect(formatted).toContain('Assistant: Message 5');
    expect(formatted).not.toContain('Assistant: Message 3');
  });

  it('builds a shorter fallback prompt than the primary prompt', () => {
    const messages = Array.from({ length: 12 }, (_, index) =>
      makeMessage(
        `m-${index}`,
        index % 2 === 0 ? 'user' : 'assistant',
        `Message ${index} ${'context '.repeat(50)}`,
      ),
    );

    const prompts = buildSynthesisPrompts(messages);

    expect(prompts.fallback.length).toBeLessThan(prompts.primary.length);
  });

  it('normalizes blank strings with a fallback', () => {
    expect(normalizeStringWithFallback('  ', 'fallback')).toBe('fallback');
    expect(normalizeStringWithFallback('  value  ', 'fallback')).toBe('value');
  });
});
