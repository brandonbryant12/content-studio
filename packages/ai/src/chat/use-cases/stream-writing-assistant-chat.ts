import {
  jsonSchema,
  tool,
  type ToolChoice,
  type UIMessage,
  type ToolSet,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';
import {
  chatWritingAssistantSystemPrompt,
  renderPrompt,
} from '../../prompt-registry';
import { withAIUsageScope } from '../../usage';
import { getMessageText } from './chat-message-utils';

const WRITING_ASSISTANT_TRANSCRIPT_MAX_CONTEXT_CHARS = 12_000;
const DIRECT_REWRITE_REQUEST_PATTERNS = [
  /\b(rewrite|redraft|rework|revise|edit|polish|tighten|trim|shorten|condense|simplify|streamline|expand|lengthen|smooth(?:\s+out)?|sharpen|strengthen|soften|clarify|clean up|fix|improve|punch up)\b/i,
  /\b(write|draft|change|adjust|make|turn|convert)\b/i,
  /\b(add|remove|cut)\b/i,
] as const;
const DISCUSSION_ONLY_REQUEST_PATTERNS = [
  /\b(give|show|offer|brainstorm|suggest|list)\b.*\b(options?|alternatives?|ideas|openings?|lines?|versions?)\b/i,
  /\bwhat makes\b/i,
  /\bfeedback\b/i,
  /\bcritique\b/i,
  /\banaly[sz]e\b/i,
  /\bdiagnos(?:e|is)\b/i,
  /\bwhy\b/i,
  /\bexplain\b/i,
] as const;

export interface WritingAssistantTranscriptWriteInput {
  readonly transcript: string;
}

export interface WritingAssistantTranscriptWriteResult {
  readonly status: 'applied';
  readonly appliedTranscript: string;
}

const writingAssistantTools = {
  updateVoiceoverText: tool<
    WritingAssistantTranscriptWriteInput,
    WritingAssistantTranscriptWriteResult
  >({
    description:
      'Write the full updated transcript text directly to the voiceover editor.',
    inputSchema: jsonSchema<WritingAssistantTranscriptWriteInput>({
      type: 'object',
      additionalProperties: false,
      properties: {
        transcript: {
          type: 'string',
          description:
            'The complete transcript text that should replace the editor contents.',
        },
      },
      required: ['transcript'],
    }),
    outputSchema: jsonSchema<WritingAssistantTranscriptWriteResult>({
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['applied'] },
        appliedTranscript: {
          type: 'string',
          description:
            'Transcript text written to the editor after the tool call.',
        },
      },
      required: ['status', 'appliedTranscript'],
    }),
  }),
} as const satisfies ToolSet;

export interface StreamWritingAssistantChatInput {
  readonly messages: UIMessage[];
  readonly transcript: string;
}

function normalizeTranscriptForPrompt(transcript: string) {
  const trimmedTranscript = transcript.trim();
  if (trimmedTranscript.length === 0) {
    return '[Transcript is currently empty]';
  }

  const truncatedTranscript = trimmedTranscript.slice(
    0,
    WRITING_ASSISTANT_TRANSCRIPT_MAX_CONTEXT_CHARS,
  );
  if (truncatedTranscript === trimmedTranscript) {
    return trimmedTranscript;
  }

  return `${truncatedTranscript}\n\n[Transcript truncated for context length]`;
}

function getCurrentTurnUserMessageText(messages: readonly UIMessage[]) {
  const latestMessage = messages.at(-1);
  if (!latestMessage || latestMessage.role !== 'user') {
    return '';
  }

  return getMessageText(latestMessage);
}

function selectWritingAssistantToolChoice(
  messages: readonly UIMessage[],
): ToolChoice<typeof writingAssistantTools> | undefined {
  const latestUserMessageText = getCurrentTurnUserMessageText(messages).trim();
  if (latestUserMessageText.length === 0) {
    return undefined;
  }

  if (
    DISCUSSION_ONLY_REQUEST_PATTERNS.some((pattern) =>
      pattern.test(latestUserMessageText),
    )
  ) {
    return undefined;
  }

  if (
    DIRECT_REWRITE_REQUEST_PATTERNS.some((pattern) =>
      pattern.test(latestUserMessageText),
    )
  ) {
    return {
      type: 'tool',
      toolName: 'updateVoiceoverText',
    };
  }

  return undefined;
}

export const streamWritingAssistantChat = (
  input: StreamWritingAssistantChatInput,
) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const promptTranscript = normalizeTranscriptForPrompt(input.transcript);
    const toolChoice = selectWritingAssistantToolChoice(input.messages);
    return yield* llm.streamText({
      system: renderPrompt(chatWritingAssistantSystemPrompt, {
        transcript: promptTranscript,
      }),
      messages: input.messages,
      tools: writingAssistantTools,
      toolChoice,
      maxTokens: 1024,
      temperature: 0.7,
    });
  }).pipe(
    withAIUsageScope({ operation: 'useCase.streamWritingAssistantChat' }),
    Effect.withSpan('useCase.streamWritingAssistantChat', {
      attributes: {
        'chat.messageCount': input.messages.length,
        'chat.transcriptChars': input.transcript.length,
      },
    }),
  );
