import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@repo/api/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { rawApiClient } from '@/clients/apiClient';

export type WritingAssistantDocumentKind = 'voiceover' | 'podcast';

interface DraftWriteToolInput {
  readonly draft: string;
}

interface PodcastScriptSegment {
  readonly speaker: string;
  readonly line: string;
  readonly index: number;
}

interface PodcastScriptWriteToolInput {
  readonly segments: PodcastScriptSegment[];
}

interface VoiceoverWritingAssistantOptions {
  readonly documentKind: 'voiceover';
  readonly draft: string;
  readonly onApplyDraftEdit: (nextDraft: string) => void;
  readonly confirmationMessage?: string;
}

interface PodcastWritingAssistantOptions {
  readonly documentKind: 'podcast';
  readonly draft: string;
  readonly speakerNames?: readonly string[];
  readonly onApplySegmentsEdit: (segments: PodcastScriptSegment[]) => void;
  readonly getDraftFromSegments: (segments: PodcastScriptSegment[]) => string;
  readonly confirmationMessage?: string;
}

export type UseWritingAssistantChatOptions =
  | VoiceoverWritingAssistantOptions
  | PodcastWritingAssistantOptions;

interface WritingAssistantRequestBody {
  readonly documentKind: WritingAssistantDocumentKind;
  readonly draft: string;
  readonly speakerNames?: string[];
}

type WritingAssistantMessage = UIMessage;

const DRAFT_WRITE_TOOL = 'updateDraftText' as const;
const PODCAST_WRITE_TOOL = 'updatePodcastScript' as const;
const WRITE_CONFIRMATION_PREFIX = 'assistant-confirmation' as const;
const DEFAULT_CONFIRMATION_MESSAGE =
  'I updated the script in the editor. Review the new draft and tell me what to adjust next.';

type DraftWriteToolPart = WritingAssistantMessage['parts'][number] & {
  readonly type: `tool-${typeof DRAFT_WRITE_TOOL}`;
  readonly toolCallId: string;
  readonly state: 'input-available' | 'output-available';
  readonly input: DraftWriteToolInput;
};

type PodcastWriteToolPart = WritingAssistantMessage['parts'][number] & {
  readonly type: `tool-${typeof PODCAST_WRITE_TOOL}`;
  readonly toolCallId: string;
  readonly state: 'input-available' | 'output-available';
  readonly input: PodcastScriptWriteToolInput;
};

type PendingWrite =
  | {
      readonly kind: 'voiceover';
      readonly toolCallId: string;
      readonly draft: string;
    }
  | {
      readonly kind: 'podcast';
      readonly toolCallId: string;
      readonly segments: PodcastScriptSegment[];
    };

function createRequestBody(
  documentKind: WritingAssistantDocumentKind,
  draft: string,
  speakerNames?: readonly string[],
): WritingAssistantRequestBody {
  return {
    documentKind,
    draft,
    ...(speakerNames && speakerNames.length > 0
      ? { speakerNames: [...speakerNames] }
      : {}),
  };
}

function getRequestBody(
  body: object | undefined,
): WritingAssistantRequestBody | null {
  if (!body || typeof body !== 'object') return null;

  const maybeBody = body as Partial<WritingAssistantRequestBody>;
  if (
    maybeBody.documentKind !== 'voiceover' &&
    maybeBody.documentKind !== 'podcast'
  ) {
    return null;
  }

  if (typeof maybeBody.draft !== 'string') {
    return null;
  }

  const speakerNames = Array.isArray(maybeBody.speakerNames)
    ? maybeBody.speakerNames.filter(
        (speaker): speaker is string => typeof speaker === 'string',
      )
    : undefined;

  return {
    documentKind: maybeBody.documentKind,
    draft: maybeBody.draft,
    ...(speakerNames === undefined ? {} : { speakerNames }),
  };
}

function isDraftWriteInput(value: unknown): value is DraftWriteToolInput {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as { draft?: unknown }).draft === 'string';
}

function isPodcastScriptSegment(value: unknown): value is PodcastScriptSegment {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const segment = value as Partial<PodcastScriptSegment>;

  return (
    typeof segment.speaker === 'string' &&
    typeof segment.line === 'string' &&
    typeof segment.index === 'number'
  );
}

function isPodcastWriteInput(value: unknown): value is PodcastScriptWriteToolInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const segments = (value as { segments?: unknown }).segments;
  return Array.isArray(segments) && segments.every(isPodcastScriptSegment);
}

function isDraftWriteToolPart(
  part: WritingAssistantMessage['parts'][number],
): part is DraftWriteToolPart {
  if (part.type !== `tool-${DRAFT_WRITE_TOOL}`) return false;

  const state = (part as { state?: unknown }).state;
  if (state !== 'input-available' && state !== 'output-available') {
    return false;
  }

  if (typeof (part as { toolCallId?: unknown }).toolCallId !== 'string') {
    return false;
  }

  return isDraftWriteInput((part as { input?: unknown }).input);
}

function isPodcastWriteToolPart(
  part: WritingAssistantMessage['parts'][number],
): part is PodcastWriteToolPart {
  if (part.type !== `tool-${PODCAST_WRITE_TOOL}`) return false;

  const state = (part as { state?: unknown }).state;
  if (state !== 'input-available' && state !== 'output-available') {
    return false;
  }

  if (typeof (part as { toolCallId?: unknown }).toolCallId !== 'string') {
    return false;
  }

  return isPodcastWriteInput((part as { input?: unknown }).input);
}

function isPendingDraftWriteToolPart(
  part: WritingAssistantMessage['parts'][number],
): part is DraftWriteToolPart & { readonly state: 'input-available' } {
  return isDraftWriteToolPart(part) && part.state === 'input-available';
}

function isPendingPodcastWriteToolPart(
  part: WritingAssistantMessage['parts'][number],
): part is PodcastWriteToolPart & { readonly state: 'input-available' } {
  return isPodcastWriteToolPart(part) && part.state === 'input-available';
}

function isWriteToolPart(
  part: WritingAssistantMessage['parts'][number],
): part is DraftWriteToolPart | PodcastWriteToolPart {
  return isDraftWriteToolPart(part) || isPodcastWriteToolPart(part);
}

function extractPendingWrites(messages: readonly WritingAssistantMessage[]) {
  const writes: PendingWrite[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    for (const part of message.parts) {
      if (isPendingDraftWriteToolPart(part)) {
        writes.push({
          kind: 'voiceover',
          toolCallId: part.toolCallId,
          draft: part.input.draft,
        });
        continue;
      }

      if (isPendingPodcastWriteToolPart(part)) {
        writes.push({
          kind: 'podcast',
          toolCallId: part.toolCallId,
          segments: part.input.segments,
        });
      }
    }
  }

  return writes;
}

function createWriteConfirmationMessage(
  toolCallId: string,
  confirmationMessage: string,
): WritingAssistantMessage {
  return {
    id: `${WRITE_CONFIRMATION_PREFIX}-${toolCallId}`,
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: confirmationMessage,
      },
    ],
  } as WritingAssistantMessage;
}

function addWriteConfirmationMessages(
  messages: readonly WritingAssistantMessage[],
  appliedToolCallIds: ReadonlySet<string>,
  confirmationMessage: string,
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
      if (!isWriteToolPart(part)) {
        continue;
      }

      if (!appliedToolCallIds.has(part.toolCallId)) {
        continue;
      }

      const confirmation = createWriteConfirmationMessage(
        part.toolCallId,
        confirmationMessage,
      );

      if (existingMessageIds.has(confirmation.id)) {
        continue;
      }

      existingMessageIds.add(confirmation.id);
      messagesWithConfirmations.push(confirmation);
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
    const requestBody = getRequestBody(options.body);

    const iterator = await rawApiClient.chat.writingAssistant(
      {
        messages: options.messages,
        documentKind: requestBody?.documentKind ?? 'voiceover',
        draft: requestBody?.draft ?? '',
        speakerNames: requestBody?.speakerNames,
      },
      { signal: options.abortSignal },
    );

    return eventIteratorToUnproxiedDataStream(iterator);
  },
  reconnectToStream: async () => null,
};

export function useWritingAssistantChat(options: UseWritingAssistantChatOptions) {
  const { documentKind, draft } = options;
  const confirmationMessage =
    options.confirmationMessage ?? DEFAULT_CONFIRMATION_MESSAGE;
  const speakerNames =
    options.documentKind === 'podcast' ? options.speakerNames : undefined;
  const onApplyDraftEdit =
    options.documentKind === 'voiceover' ? options.onApplyDraftEdit : undefined;
  const onApplySegmentsEdit =
    options.documentKind === 'podcast'
      ? options.onApplySegmentsEdit
      : undefined;
  const getDraftFromSegments =
    options.documentKind === 'podcast'
      ? options.getDraftFromSegments
      : undefined;

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
      const pendingWrites = extractPendingWrites(chatMessages);
      let latestAppliedDraft: string | null = null;
      const appliedWriteToolCallIds: string[] = [];

      for (const write of pendingWrites) {
        if (handledToolCallIdsRef.current.has(write.toolCallId)) {
          continue;
        }

        handledToolCallIdsRef.current.add(write.toolCallId);

        try {
          if (write.kind === 'voiceover') {
            if (documentKind !== 'voiceover') {
              throw new Error('Unexpected voiceover edit for podcast chat');
            }
            if (!onApplyDraftEdit) {
              throw new Error('Voiceover assistant missing draft edit handler');
            }

            if (write.draft !== draft) {
              onApplyDraftEdit(write.draft);
            }

            await addToolResult({
              tool: DRAFT_WRITE_TOOL,
              toolCallId: write.toolCallId,
              output: {
                status: 'applied',
                appliedDraft: write.draft,
              },
            });

            latestAppliedDraft = write.draft;
          } else {
            if (documentKind !== 'podcast') {
              throw new Error('Unexpected podcast edit for voiceover chat');
            }
            if (!onApplySegmentsEdit || !getDraftFromSegments) {
              throw new Error('Podcast assistant missing segment edit handlers');
            }

            onApplySegmentsEdit(write.segments);

            await addToolResult({
              tool: PODCAST_WRITE_TOOL,
              toolCallId: write.toolCallId,
              output: {
                status: 'applied',
                appliedSegments: write.segments,
              },
            });

            latestAppliedDraft = getDraftFromSegments(write.segments);
          }

          appliedWriteToolCallIds.push(write.toolCallId);
        } catch {
          handledToolCallIdsRef.current.delete(write.toolCallId);
        }

        if (isCancelled) {
          return;
        }
      }

      if (!latestAppliedDraft || isCancelled) {
        return;
      }

      setAppliedToolCallIds((currentToolCallIds) => {
        const nextToolCallIds = new Set(currentToolCallIds);

        for (const toolCallId of appliedWriteToolCallIds) {
          nextToolCallIds.add(toolCallId);
        }

        return [...nextToolCallIds];
      });

      try {
        await sendMessage(undefined, {
          body: createRequestBody(
            documentKind,
            latestAppliedDraft,
            speakerNames,
          ),
        });
      } catch {
        // Keep the applied editor state even if the follow-up continuation fails.
      }
    };

    void applyPendingWrites();

    return () => {
      isCancelled = true;
    };
  }, [
    addToolResult,
    chatMessages,
    documentKind,
    draft,
    getDraftFromSegments,
    onApplyDraftEdit,
    onApplySegmentsEdit,
    sendMessage,
    speakerNames,
  ]);

  const messages = addWriteConfirmationMessages(
    chatMessages,
    new Set(appliedToolCallIds),
    confirmationMessage,
  );

  const isStreaming = status === 'submitted' || status === 'streaming';

  const sendUserMessage = useCallback(
    (text: string) =>
      sendMessage(
        { text },
        {
          body: createRequestBody(
            documentKind,
            draft,
            speakerNames,
          ),
        },
      ),
    [documentKind, draft, sendMessage, speakerNames],
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
