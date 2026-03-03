import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useCallback, useMemo } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

interface TranscriptEditToolInput {
  readonly summary: string;
  readonly revisedTranscript: string;
}

interface TranscriptEditToolOutput {
  readonly decision: 'accepted' | 'rejected';
  readonly appliedTranscript?: string;
  readonly reason?: string;
}

type WritingAssistantMessage = UIMessage;

type TranscriptEditToolPart = {
  readonly type: 'tool-proposeTranscriptEdit';
  readonly toolCallId: string;
  readonly state:
    | 'input-streaming'
    | 'input-available'
    | 'approval-requested'
    | 'approval-responded'
    | 'output-available'
    | 'output-error'
    | 'output-denied';
  readonly input?: unknown;
  readonly output?: unknown;
  readonly errorText?: string;
  readonly approval?: {
    readonly reason?: string;
  };
};

type TranscriptEditDecision = 'pending' | 'accepted' | 'rejected' | 'error';

export interface TranscriptEditProposal {
  readonly toolCallId: string;
  readonly summary: string;
  readonly revisedTranscript: string;
  readonly decision: TranscriptEditDecision;
  readonly reason?: string;
}

function getTranscriptFromRequestBody(body: object | undefined) {
  if (!body || typeof body !== 'object') return '';
  const transcript = (body as { transcript?: unknown }).transcript;
  return typeof transcript === 'string' ? transcript : '';
}

function isTranscriptEditInput(value: unknown): value is TranscriptEditToolInput {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as {
    summary?: unknown;
    revisedTranscript?: unknown;
  };

  return (
    typeof candidate.summary === 'string' &&
    typeof candidate.revisedTranscript === 'string'
  );
}

function isTranscriptEditOutput(
  value: unknown,
): value is TranscriptEditToolOutput {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as {
    decision?: unknown;
    reason?: unknown;
    appliedTranscript?: unknown;
  };

  if (candidate.decision !== 'accepted' && candidate.decision !== 'rejected') {
    return false;
  }

  if (
    candidate.reason !== undefined &&
    typeof candidate.reason !== 'string'
  ) {
    return false;
  }

  if (
    candidate.appliedTranscript !== undefined &&
    typeof candidate.appliedTranscript !== 'string'
  ) {
    return false;
  }

  return true;
}

function isTranscriptEditToolPart(
  part: WritingAssistantMessage['parts'][number],
): boolean {
  return part.type === 'tool-proposeTranscriptEdit';
}

function getToolInput(part: TranscriptEditToolPart): TranscriptEditToolInput | null {
  if (
    part.state === 'input-available' ||
    part.state === 'approval-requested' ||
    part.state === 'approval-responded' ||
    part.state === 'output-available' ||
    part.state === 'output-denied'
  ) {
    return isTranscriptEditInput(part.input) ? part.input : null;
  }

  if (
    part.state === 'output-error' &&
    isTranscriptEditInput(part.input)
  ) {
    return part.input;
  }

  return null;
}

function toProposal(part: TranscriptEditToolPart): TranscriptEditProposal | null {
  const input = getToolInput(part);
  if (!input) return null;

  if (
    part.state === 'input-available' ||
    part.state === 'approval-requested' ||
    part.state === 'approval-responded'
  ) {
    return {
      toolCallId: part.toolCallId,
      summary: input.summary,
      revisedTranscript: input.revisedTranscript,
      decision: 'pending',
    };
  }

  if (part.state === 'output-available') {
    if (!isTranscriptEditOutput(part.output)) return null;

    return {
      toolCallId: part.toolCallId,
      summary: input.summary,
      revisedTranscript: input.revisedTranscript,
      decision: part.output.decision,
      reason: part.output.reason,
    };
  }

  if (part.state === 'output-denied') {
    return {
      toolCallId: part.toolCallId,
      summary: input.summary,
      revisedTranscript: input.revisedTranscript,
      decision: 'rejected',
      reason: part.approval?.reason,
    };
  }

  if (part.state === 'output-error') {
    return {
      toolCallId: part.toolCallId,
      summary: input.summary,
      revisedTranscript: input.revisedTranscript,
      decision: 'error',
      reason: part.errorText,
    };
  }

  return null;
}

function extractTranscriptEditProposals(
  messages: readonly WritingAssistantMessage[],
) {
  const proposals: TranscriptEditProposal[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    for (const part of message.parts) {
      if (!isTranscriptEditToolPart(part)) continue;

      const proposal = toProposal(part as TranscriptEditToolPart);
      if (!proposal) continue;
      proposals.push(proposal);
    }
  }

  return proposals;
}

const transport = {
  sendMessages: async (options: {
    messages: WritingAssistantMessage[];
    abortSignal: AbortSignal | undefined;
    body?: object;
  }) => {
    const transcript = getTranscriptFromRequestBody(options.body);
    const iterator = await rawApiClient.chat.writingAssistant(
      { messages: options.messages, transcript },
      { signal: options.abortSignal },
    );
    return eventIteratorToUnproxiedDataStream(iterator);
  },
  reconnectToStream: async () => null,
};

const DEFAULT_REJECTION_REASON =
  'Auto-rejected because you continued the conversation without accepting this edit.';

export function useWritingAssistantChat(transcript: string) {
  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    addToolResult,
  } = useChat<WritingAssistantMessage>({
    transport,
  });

  const requestOptions = useMemo(
    () => ({ body: { transcript } }),
    [transcript],
  );

  const isStreaming = status === 'submitted' || status === 'streaming';
  const proposals = useMemo(
    () => extractTranscriptEditProposals(messages),
    [messages],
  );

  const resolvePendingProposals = useCallback(
    async (
      resolver: (proposal: TranscriptEditProposal) => TranscriptEditToolOutput,
    ) => {
      const pendingProposals = proposals.filter(
        (proposal) => proposal.decision === 'pending',
      );

      for (const proposal of pendingProposals) {
        await addToolResult({
          tool: 'proposeTranscriptEdit',
          toolCallId: proposal.toolCallId,
          output: resolver(proposal),
        });
      }
    },
    [addToolResult, proposals],
  );

  const continueConversation = useCallback(
    () => sendMessage(undefined, requestOptions),
    [requestOptions, sendMessage],
  );

  const sendUserMessage = useCallback(
    async (text: string) => {
      await resolvePendingProposals(() => ({
        decision: 'rejected',
        reason: DEFAULT_REJECTION_REASON,
      }));

      await sendMessage({ text }, requestOptions);
    },
    [requestOptions, resolvePendingProposals, sendMessage],
  );

  const acceptProposal = useCallback(
    async (proposal: TranscriptEditProposal) => {
      await resolvePendingProposals((pendingProposal) =>
        pendingProposal.toolCallId === proposal.toolCallId
          ? {
              decision: 'accepted',
              appliedTranscript: proposal.revisedTranscript,
              reason: 'Applied in editor.',
            }
          : {
              decision: 'rejected',
              reason:
                'Rejected automatically because another transcript edit was accepted.',
            },
      );

      await continueConversation();
    },
    [continueConversation, resolvePendingProposals],
  );

  const rejectProposal = useCallback(
    async (proposal: TranscriptEditProposal) => {
      await resolvePendingProposals((pendingProposal) =>
        pendingProposal.toolCallId === proposal.toolCallId
          ? { decision: 'rejected', reason: 'Rejected in editor.' }
          : {
              decision: 'rejected',
              reason:
                'Rejected automatically because another transcript edit was reviewed.',
            },
      );

      await continueConversation();
    },
    [continueConversation, resolvePendingProposals],
  );

  const reset = useCallback(() => setMessages([]), [setMessages]);

  return {
    messages,
    sendUserMessage,
    proposals,
    acceptProposal,
    rejectProposal,
    status,
    isStreaming,
    error,
    reset,
  };
}
