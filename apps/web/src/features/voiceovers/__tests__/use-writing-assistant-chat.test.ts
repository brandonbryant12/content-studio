import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { useWritingAssistantChat } from '../hooks/use-writing-assistant-chat';

const { useChatMock, sendMessageSpy, addToolResultSpy, setMessagesSpy } =
  vi.hoisted(() => ({
    useChatMock: vi.fn(),
    sendMessageSpy: vi.fn(),
    addToolResultSpy: vi.fn(),
    setMessagesSpy: vi.fn(),
  }));

vi.mock('@ai-sdk/react', () => ({
  useChat: useChatMock,
}));

vi.mock('@/clients/apiClient', () => ({
  rawApiClient: {
    chat: {
      writingAssistant: vi.fn(),
    },
  },
}));

function pendingTranscriptWriteMessage(
  toolCallId: string,
  transcript: string,
): UIMessage {
  return {
    id: `assistant-${toolCallId}`,
    role: 'assistant',
    parts: [
      {
        type: 'tool-updateVoiceoverText',
        toolCallId,
        state: 'input-available',
        input: {
          transcript,
        },
      },
    ],
  } as UIMessage;
}

describe('useWritingAssistantChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    sendMessageSpy.mockResolvedValue(undefined);
    addToolResultSpy.mockResolvedValue(undefined);

    useChatMock.mockReturnValue({
      messages: [],
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    });
  });

  it('applies transcript writes from tool calls and acknowledges the tool output', async () => {
    const onApplyTranscriptEdit = vi.fn();
    const initialMessages = [
      pendingTranscriptWriteMessage(
        'tool-1',
        'Updated transcript for stronger pacing.',
      ),
    ];

    useChatMock.mockReturnValue({
      messages: initialMessages,
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    });

    renderHook(() =>
      useWritingAssistantChat(
        'Current transcript context',
        onApplyTranscriptEdit,
      ),
    );

    await waitFor(() => {
      expect(onApplyTranscriptEdit).toHaveBeenCalledWith(
        'Updated transcript for stronger pacing.',
      );
    });

    expect(addToolResultSpy).toHaveBeenCalledWith({
      tool: 'updateVoiceoverText',
      toolCallId: 'tool-1',
      output: {
        status: 'applied',
        appliedTranscript: 'Updated transcript for stronger pacing.',
      },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith(undefined, {
      body: { transcript: 'Updated transcript for stronger pacing.' },
    });

    await waitFor(() => {
      expect(setMessagesSpy).toHaveBeenCalled();
    });

    const appendMessages = vi.mocked(setMessagesSpy).mock.calls[0]?.[0];
    expect(typeof appendMessages).toBe('function');

    const nextMessages =
      typeof appendMessages === 'function'
        ? appendMessages(initialMessages)
        : appendMessages;

    expect(nextMessages).toContainEqual(
      expect.objectContaining({
        id: 'assistant-confirmation-tool-1',
        role: 'assistant',
        parts: [
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('updated the script in the editor'),
          }),
        ],
      }),
    );
  });

  it('sends user messages with transcript context', async () => {
    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context', vi.fn()),
    );

    await act(async () => {
      await result.current.sendUserMessage('Try a warmer tone.');
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      { text: 'Try a warmer tone.' },
      { body: { transcript: 'Current transcript context' } },
    );
  });

  it('resets chat messages through setMessages', () => {
    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context', vi.fn()),
    );

    act(() => {
      result.current.reset();
    });

    expect(setMessagesSpy).toHaveBeenCalledWith([]);
  });
});
