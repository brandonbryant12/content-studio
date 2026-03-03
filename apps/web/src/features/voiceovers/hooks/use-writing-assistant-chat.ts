import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useCallback, useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

interface TranscriptWriteToolInput {
  readonly transcript: string;
}

type WritingAssistantMessage = UIMessage;
const TRANSCRIPT_WRITE_TOOL = 'updateVoiceoverText' as const;

type TranscriptWriteToolPart = WritingAssistantMessage['parts'][number] & {
  readonly type: `tool-${typeof TRANSCRIPT_WRITE_TOOL}`;
  readonly toolCallId: string;
  readonly state: 'input-available';
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
  if ((part as { state?: unknown }).state !== 'input-available') return false;
  if (typeof (part as { toolCallId?: unknown }).toolCallId !== 'string') {
    return false;
  }
  return isTranscriptWriteInput((part as { input?: unknown }).input);
}

function extractPendingTranscriptWrites(
  messages: readonly WritingAssistantMessage[],
) {
  const writes: Array<{ toolCallId: string; transcript: string }> = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    for (const part of message.parts) {
      if (!isTranscriptWriteToolPart(part)) continue;

      writes.push({
        toolCallId: part.toolCallId,
        transcript: part.input.transcript,
      });
    }
  }

  return writes;
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
  const { messages, sendMessage, status, error, setMessages, addToolResult } =
    useChat<WritingAssistantMessage>({
      transport,
    });

  const handledToolCallIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let isCancelled = false;

    const applyPendingWrites = async () => {
      const pendingWrites = extractPendingTranscriptWrites(messages);
      let latestAppliedTranscript: string | null = null;

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

      try {
        await sendMessage(undefined, {
          body: { transcript: latestAppliedTranscript },
        });
      } catch {
        // Keep the applied editor state even if follow-up chat continuation fails.
      }
    };

    void applyPendingWrites();

    return () => {
      isCancelled = true;
    };
  }, [addToolResult, messages, onApplyTranscriptEdit, sendMessage, transcript]);

  const isStreaming = status === 'submitted' || status === 'streaming';

  const sendUserMessage = useCallback(
    (text: string) => sendMessage({ text }, { body: { transcript } }),
    [sendMessage, transcript],
  );

  const reset = useCallback(() => {
    handledToolCallIdsRef.current.clear();
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
