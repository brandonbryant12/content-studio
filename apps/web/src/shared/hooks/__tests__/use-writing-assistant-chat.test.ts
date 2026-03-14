import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { useWritingAssistantChat } from '../use-writing-assistant-chat';

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

function podcastWriteMessage(
  toolCallId: string,
  segments: Array<{ speaker: string; line: string; index: number }>,
  state: 'input-available' | 'output-available' = 'input-available',
): UIMessage {
  return {
    id: `assistant-${toolCallId}`,
    role: 'assistant',
    parts: [
      state === 'output-available'
        ? {
            type: 'tool-updatePodcastScript',
            toolCallId,
            state,
            input: {
              segments,
            },
            output: {
              status: 'applied',
              appliedSegments: segments,
            },
          }
        : {
            type: 'tool-updatePodcastScript',
            toolCallId,
            state,
            input: {
              segments,
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

  it('applies structured podcast edits without coercing speaker labels or colon text', async () => {
    const assistantSegments = [
      {
        speaker: 'Analyst',
        line: 'Key statistic: Revenue rose 20%.',
        index: 0,
      },
    ];
    const onApplySegmentsEdit = vi.fn();
    const getDraftFromSegments = vi.fn(
      (segments: Array<{ speaker: string; line: string; index: number }>) =>
        segments.map((segment) => `[${segment.speaker}]\n${segment.line}`).join('\n\n'),
    );

    useChatMock.mockReturnValue({
      messages: [podcastWriteMessage('tool-1', assistantSegments)],
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    });

    const { result } = renderHook(() =>
      useWritingAssistantChat({
        documentKind: 'podcast',
        draft: '[Alex]\nOriginal intro.',
        speakerNames: ['Alex', 'Blair'],
        onApplySegmentsEdit,
        getDraftFromSegments,
      }),
    );

    await waitFor(() => {
      expect(onApplySegmentsEdit).toHaveBeenCalledWith(assistantSegments);
    });

    expect(addToolResultSpy).toHaveBeenCalledWith({
      tool: 'updatePodcastScript',
      toolCallId: 'tool-1',
      output: {
        status: 'applied',
        appliedSegments: assistantSegments,
      },
    });
    expect(getDraftFromSegments).toHaveBeenCalledWith(assistantSegments);
    expect(sendMessageSpy).toHaveBeenCalledWith(undefined, {
      body: {
        documentKind: 'podcast',
        draft: '[Analyst]\nKey statistic: Revenue rose 20%.',
        speakerNames: ['Alex', 'Blair'],
      },
    });

    await waitFor(() => {
      expect(result.current.messages).toContainEqual(
        expect.objectContaining({
          id: 'assistant-confirmation-tool-1',
          role: 'assistant',
        }),
      );
    });
  });
});
