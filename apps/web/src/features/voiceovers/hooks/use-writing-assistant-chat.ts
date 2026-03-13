import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

interface TranscriptWriteToolInput {
  readonly transcript: string;
}

type WritingAssistantMessage = UIMessage;
const TRANSCRIPT_WRITE_TOOL = 'updateVoiceoverText' as const;
const WRITE_CONFIRMATION_PREFIX = 'assistant-confirmation' as const;

type TranscriptWriteToolPart = WritingAssistantMessage['parts'][number] & {
  readonly type: `tool-${typeof TRANSCRIPT_WRITE_TOOL}`;
  readonly toolCallId: string;
  readonly state: 'input-available' | 'output-available';
  readonly input: TranscriptWriteToolInput;
};

function getTranscriptFromRequestBody(body: object | undefined) {
  if (!body || typeof body !== 'object') return '';
  const transcript = (body as { transcript?: unknown }).transcript;
  return typeof transcript === 'string' ? transcript : '';
}

function isTranscriptWriteInput(
  value: unknown,
): value is TranscriptWriteToolInput {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as { transcript?: unknown }).transcript === 'string';
}

function isTranscriptWriteToolPart(
  part: WritingAssistantMessage['parts'][number],
): part is TranscriptWriteToolPart {
  if (part.type !== `tool-${TRANSCRIPT_WRITE_TOOL}`) return false;
  const state = (part as { state?: unknown }).state;
  if (state !== 'input-available' && state !== 'output-available') {
    return false;
  }
  if (typeof (part as { toolCallId?: unknown }).toolCallId !== 'string') {
    return false;
  }
  return isTranscriptWriteInput((part as { input?: unknown }).input);
}

function isPendingTranscriptWriteToolPart(
  part: WritingAssistantMessage['parts'][number],
): part is TranscriptWriteToolPart & { readonly state: 'input-available' } {
  return isTranscriptWriteToolPart(part) && part.state === 'input-available';
}

function extractPendingTranscriptWrites(
  messages: readonly WritingAssistantMessage[],
) {
  const writes: Array<{ toolCallId: string; transcript: string }> = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    for (const part of message.parts) {
      if (!isPendingTranscriptWriteToolPart(part)) continue;

      writes.push({
        toolCallId: part.toolCallId,
        transcript: part.input.transcript,
      });
    }
  }

  return writes;
}

function createTranscriptWriteConfirmationMessage(toolCallId: string) {
  return {
    id: `${WRITE_CONFIRMATION_PREFIX}-${toolCallId}`,
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'I updated the script in the editor. Review the new draft and tell me what to adjust next.',
      },
    ],
  } as WritingAssistantMessage;
}

function addTranscriptWriteConfirmationMessages(
  messages: readonly WritingAssistantMessage[],
  appliedToolCallIds: ReadonlySet<string>,
) {
  if (appliedToolCallIds.size === 0) {
    return [...messages];
  }

  const existingMessageIds = new Set(messages.map((message) => message.id));
  const messagesWithConfirmations: WritingAssistantMessage[] = [];

  for (const message of messages) {
    messagesWithConfirmations.push(message);

    if (message.role !== 'assistant') {
      continue;
    }

    for (const part of message.parts) {
      if (!isTranscriptWriteToolPart(part)) {
        continue;
      }

      if (!appliedToolCallIds.has(part.toolCallId)) {
        continue;
      }

      const confirmationMessage = createTranscriptWriteConfirmationMessage(
        part.toolCallId,
      );

      if (existingMessageIds.has(confirmationMessage.id)) {
        continue;
      }

      existingMessageIds.add(confirmationMessage.id);
      messagesWithConfirmations.push(confirmationMessage);
    }
  }

  return messagesWithConfirmations;
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

export function useWritingAssistantChat(
  transcript: string,
  onApplyTranscriptEdit: (nextTranscript: string) => void,
) {
  const {
    messages: chatMessages,
    sendMessage,
    status,
    error,
    setMessages,
    addToolResult,
  } = useChat<WritingAssistantMessage>({
    transport,
  });

  const handledToolCallIdsRef = useRef(new Set<string>());
  const [appliedToolCallIds, setAppliedToolCallIds] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const applyPendingWrites = async () => {
      const pendingWrites = extractPendingTranscriptWrites(chatMessages);
      let latestAppliedTranscript: string | null = null;
      const appliedWriteToolCallIds: string[] = [];

      for (const write of pendingWrites) {
        if (handledToolCallIdsRef.current.has(write.toolCallId)) {
          continue;
        }

        handledToolCallIdsRef.current.add(write.toolCallId);

        if (write.transcript !== transcript) {
          onApplyTranscriptEdit(write.transcript);
        }

        try {
          await addToolResult({
            tool: TRANSCRIPT_WRITE_TOOL,
            toolCallId: write.toolCallId,
            output: {
              status: 'applied',
              appliedTranscript: write.transcript,
            },
          });
          latestAppliedTranscript = write.transcript;
          appliedWriteToolCallIds.push(write.toolCallId);
        } catch {
          handledToolCallIdsRef.current.delete(write.toolCallId);
        }

        if (isCancelled) {
          return;
        }
      }

      if (!latestAppliedTranscript || isCancelled) {
        return;
      }

      setAppliedToolCallIds((currentToolCallIds) => {
        const nextToolCallIds = new Set(currentToolCallIds);

        for (const toolCallId of appliedWriteToolCallIds) {
          nextToolCallIds.add(toolCallId);
        }

        return [...nextToolCallIds];
      });

      const followUpPromise = sendMessage(undefined, {
        body: { transcript: latestAppliedTranscript },
      });

      try {
        await followUpPromise;
      } catch {
        // Keep the applied editor state even if follow-up chat continuation fails.
      }
    };

    void applyPendingWrites();

    return () => {
      isCancelled = true;
    };
  }, [
    addToolResult,
    chatMessages,
    onApplyTranscriptEdit,
    sendMessage,
    transcript,
  ]);

  const messages = addTranscriptWriteConfirmationMessages(
    chatMessages,
    new Set(appliedToolCallIds),
  );

  const isStreaming = status === 'submitted' || status === 'streaming';

  const sendUserMessage = useCallback(
    (text: string) => sendMessage({ text }, { body: { transcript } }),
    [sendMessage, transcript],
  );

  const reset = useCallback(() => {
    handledToolCallIdsRef.current.clear();
    setAppliedToolCallIds([]);
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    sendUserMessage,
    status,
    isStreaming,
    error,
    reset,
  };
}
