import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  CHAT_CONTROL_TOKENS,
  getChatAutomationState,
  stripChatControlTokens,
} from './chat-control';

function userMessage(id: string, text: string): UIMessage {
  return {
    id,
    role: 'user',
    parts: [{ type: 'text', text }],
  };
}

function assistantMessage(id: string, text: string): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text }],
  };
}

describe('chat-control', () => {
  it('strips control tokens from visible chat text', () => {
    expect(
      stripChatControlTokens(
        `Ready to proceed ${CHAT_CONTROL_TOKENS.startResearch}`,
      ),
    ).toBe('Ready to proceed');
    expect(
      stripChatControlTokens(
        `${CHAT_CONTROL_TOKENS.createPersona} Persona is fully defined`,
      ),
    ).toBe('Persona is fully defined');
  });

  it('auto-triggers when assistant emits control token', () => {
    const messages: UIMessage[] = [
      userMessage('u1', 'I want a persona for a technology podcast'),
      assistantMessage(
        'a1',
        `Great, we are ready ${CHAT_CONTROL_TOKENS.createPersona}`,
      ),
    ];

    const state = getChatAutomationState(messages, {
      token: CHAT_CONTROL_TOKENS.createPersona,
      isStreaming: false,
    });

    expect(state.hasControlToken).toBe(true);
    expect(state.shouldAutoTrigger).toBe(true);
  });

  it('auto-triggers after two follow-ups even without token', () => {
    const messages: UIMessage[] = [
      userMessage('u1', 'Research AI in healthcare'),
      assistantMessage('a1', 'Which healthcare segment matters most?'),
      userMessage('u2', 'Hospitals and clinical workflows'),
      assistantMessage('a2', 'Do you want a 2024-2026 focus window?'),
    ];

    const state = getChatAutomationState(messages, {
      token: CHAT_CONTROL_TOKENS.startResearch,
      isStreaming: false,
    });

    expect(state.assistantMessageCount).toBe(2);
    expect(state.shouldAutoTrigger).toBe(true);
  });

  it('does not auto-trigger while assistant is still streaming', () => {
    const messages: UIMessage[] = [
      userMessage('u1', 'Create a warm storytelling host'),
      assistantMessage('a1', `Ready ${CHAT_CONTROL_TOKENS.createPersona}`),
    ];

    const state = getChatAutomationState(messages, {
      token: CHAT_CONTROL_TOKENS.createPersona,
      isStreaming: true,
    });

    expect(state.hasControlToken).toBe(true);
    expect(state.shouldAutoTrigger).toBe(false);
  });
});
