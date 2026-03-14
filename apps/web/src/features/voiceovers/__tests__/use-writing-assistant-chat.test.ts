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

function draftWriteMessage(
  toolCallId: string,
  draft: string,
  state: 'input-available' | 'output-available' = 'input-available',
): UIMessage {
  return {
    id: `assistant-${toolCallId}`,
    role: 'assistant',
    parts: [
      state === 'output-available'
        ? {
            type: 'tool-updateDraftText',
            toolCallId,
            state,
            input: {
              draft,
            },
            output: {
              status: 'applied',
              appliedDraft: draft,
            },
          }
        : {
            type: 'tool-updateDraftText',
            toolCallId,
            state,
            input: {
              draft,
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

  it('keeps the confirmation bubble after the tool call advances to output-available', async () => {
    const onApplyDraftEdit = vi.fn();
    const updatedDraft = 'Updated transcript for stronger pacing.';
    const chatState = {
      messages: [draftWriteMessage('tool-1', updatedDraft, 'input-available')],
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    };

    addToolResultSpy.mockImplementation(async ({ toolCallId, output }) => {
      chatState.messages = [
        draftWriteMessage(toolCallId, output.appliedDraft, 'output-available'),
      ];
    });

    useChatMock.mockImplementation(() => chatState);

    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context', onApplyDraftEdit),
    );

    await waitFor(() => {
      expect(onApplyDraftEdit).toHaveBeenCalledWith(updatedDraft);
    });

    expect(addToolResultSpy).toHaveBeenCalledWith({
      tool: 'updateDraftText',
      toolCallId: 'tool-1',
      output: {
        status: 'applied',
        appliedDraft: updatedDraft,
      },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith(undefined, {
      body: {
        documentKind: 'voiceover',
        draft: updatedDraft,
      },
    });

    await waitFor(() => {
      expect(result.current.messages).toContainEqual(
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
  });

  it('applies draft writes from tool calls and acknowledges the tool output', async () => {
    const onApplyDraftEdit = vi.fn();
    const initialMessages = [
      draftWriteMessage('tool-1', 'Updated transcript for stronger pacing.'),
    ];

    useChatMock.mockReturnValue({
      messages: initialMessages,
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    });

    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context', onApplyDraftEdit),
    );

    await waitFor(() => {
      expect(onApplyDraftEdit).toHaveBeenCalledWith(
        'Updated transcript for stronger pacing.',
      );
    });

    expect(addToolResultSpy).toHaveBeenCalledWith({
      tool: 'updateDraftText',
      toolCallId: 'tool-1',
      output: {
        status: 'applied',
        appliedDraft: 'Updated transcript for stronger pacing.',
      },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith(undefined, {
      body: {
        documentKind: 'voiceover',
        draft: 'Updated transcript for stronger pacing.',
      },
    });

    await waitFor(() => {
      expect(result.current.messages).toContainEqual(
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
  });

  it('sends user messages with voiceover draft context', async () => {
    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context', vi.fn()),
    );

    await act(async () => {
      await result.current.sendUserMessage('Try a warmer tone.');
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      { text: 'Try a warmer tone.' },
      {
        body: {
          documentKind: 'voiceover',
          draft: 'Current transcript context',
        },
      },
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
