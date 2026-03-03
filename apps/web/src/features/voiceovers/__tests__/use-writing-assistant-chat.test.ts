import { renderHook, act } from '@testing-library/react';
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

function pendingProposalMessage(
  toolCallId: string,
  summary: string,
  revisedTranscript: string,
): UIMessage {
  return {
    id: `assistant-${toolCallId}`,
    role: 'assistant',
    parts: [
      {
        type: 'tool-proposeTranscriptEdit',
        toolCallId,
        state: 'input-available',
        input: {
          summary,
          revisedTranscript,
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

  it('auto-rejects pending proposals before sending a new user message', async () => {
    useChatMock.mockReturnValue({
      messages: [
        pendingProposalMessage(
          'tool-1',
          'Tightened the hook.',
          'Updated transcript for intro hook.',
        ),
      ],
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    });

    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context'),
    );

    await act(async () => {
      await result.current.sendUserMessage('Try a warmer tone.');
    });

    expect(addToolResultSpy).toHaveBeenCalledWith({
      tool: 'proposeTranscriptEdit',
      toolCallId: 'tool-1',
      output: {
        decision: 'rejected',
        reason:
          'Auto-rejected because you continued the conversation without accepting this edit.',
      },
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      { text: 'Try a warmer tone.' },
      { body: { transcript: 'Current transcript context' } },
    );
  });

  it('accepts selected proposal, rejects remaining pending ones, then continues the chat', async () => {
    useChatMock.mockReturnValue({
      messages: [
        pendingProposalMessage('tool-1', 'Option A', 'Transcript A'),
        pendingProposalMessage('tool-2', 'Option B', 'Transcript B'),
      ],
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    });

    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context'),
    );

    await act(async () => {
      await result.current.acceptProposal(result.current.proposals[0]!);
    });

    expect(addToolResultSpy).toHaveBeenNthCalledWith(1, {
      tool: 'proposeTranscriptEdit',
      toolCallId: 'tool-1',
      output: {
        decision: 'accepted',
        appliedTranscript: 'Transcript A',
        reason: 'Applied in editor.',
      },
    });
    expect(addToolResultSpy).toHaveBeenNthCalledWith(2, {
      tool: 'proposeTranscriptEdit',
      toolCallId: 'tool-2',
      output: {
        decision: 'rejected',
        reason:
          'Rejected automatically because another transcript edit was accepted.',
      },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith(undefined, {
      body: { transcript: 'Current transcript context' },
    });
  });

  it('rejects all pending proposals when the selected proposal is rejected', async () => {
    useChatMock.mockReturnValue({
      messages: [
        pendingProposalMessage('tool-1', 'Option A', 'Transcript A'),
        pendingProposalMessage('tool-2', 'Option B', 'Transcript B'),
      ],
      sendMessage: sendMessageSpy,
      status: 'ready',
      error: undefined,
      setMessages: setMessagesSpy,
      addToolResult: addToolResultSpy,
    });

    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context'),
    );

    await act(async () => {
      await result.current.rejectProposal(result.current.proposals[0]!);
    });

    expect(addToolResultSpy).toHaveBeenNthCalledWith(1, {
      tool: 'proposeTranscriptEdit',
      toolCallId: 'tool-1',
      output: { decision: 'rejected', reason: 'Rejected in editor.' },
    });
    expect(addToolResultSpy).toHaveBeenNthCalledWith(2, {
      tool: 'proposeTranscriptEdit',
      toolCallId: 'tool-2',
      output: {
        decision: 'rejected',
        reason:
          'Rejected automatically because another transcript edit was reviewed.',
      },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith(undefined, {
      body: { transcript: 'Current transcript context' },
    });
  });

  it('resets chat messages through setMessages', () => {
    const { result } = renderHook(() =>
      useWritingAssistantChat('Current transcript context'),
    );

    act(() => {
      result.current.reset();
    });

    expect(setMessagesSpy).toHaveBeenCalledWith([]);
  });
});
