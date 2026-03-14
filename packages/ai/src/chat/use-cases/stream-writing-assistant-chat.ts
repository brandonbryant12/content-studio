import { jsonSchema, tool, type ToolChoice, type UIMessage } from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';
import { chatWritingAssistantSystemPrompt } from '../../prompt-registry/prompts/chat-writing-assistant-system';
import { renderPrompt } from '../../prompt-registry/render';
import { withAIUsageScope } from '../../usage/scope';
import { getMessageText } from './chat-message-utils';

const WRITING_ASSISTANT_DRAFT_MAX_CONTEXT_CHARS = 12_000;
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

export interface WritingAssistantDraftWriteInput {
  readonly draft: string;
}

export interface WritingAssistantDraftWriteResult {
  readonly status: 'applied';
  readonly appliedDraft: string;
}

export interface WritingAssistantPodcastScriptSegment {
  readonly speaker: string;
  readonly line: string;
  readonly index: number;
}

export interface WritingAssistantPodcastScriptWriteInput {
  readonly segments: WritingAssistantPodcastScriptSegment[];
}

export interface WritingAssistantPodcastScriptWriteResult {
  readonly status: 'applied';
  readonly appliedSegments: WritingAssistantPodcastScriptSegment[];
}

const DRAFT_WRITE_TOOL = 'updateDraftText' as const;
const PODCAST_WRITE_TOOL = 'updatePodcastScript' as const;

const voiceoverWritingAssistantTools = {
  [DRAFT_WRITE_TOOL]: tool<
    WritingAssistantDraftWriteInput,
    WritingAssistantDraftWriteResult
  >({
    description: 'Write the full updated draft text directly to the editor.',
    inputSchema: jsonSchema<WritingAssistantDraftWriteInput>({
      type: 'object',
      additionalProperties: false,
      properties: {
        draft: {
          type: 'string',
          description:
            'The complete draft text that should replace the editor contents.',
        },
      },
      required: ['draft'],
    }),
    outputSchema: jsonSchema<WritingAssistantDraftWriteResult>({
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['applied'] },
        appliedDraft: {
          type: 'string',
          description: 'Draft text written to the editor after the tool call.',
        },
      },
      required: ['status', 'appliedDraft'],
    }),
  }),
} as const;

export interface StreamWritingAssistantChatInput {
  readonly messages: UIMessage[];
  readonly documentKind: 'voiceover' | 'podcast';
  readonly draft: string;
  readonly speakerNames?: readonly string[];
}

function createPodcastWritingAssistantTools(
  speakerNames: readonly string[],
) {
  const speakerSchema =
    speakerNames.length > 0
      ? {
          type: 'string' as const,
          enum: [...speakerNames],
          description: 'Use one of the exact speaker labels from the draft.',
        }
      : {
          type: 'string' as const,
          description: 'Speaker label for this segment.',
        };

  return {
    [PODCAST_WRITE_TOOL]: tool<
      WritingAssistantPodcastScriptWriteInput,
      WritingAssistantPodcastScriptWriteResult
    >({
      description:
        'Write the full updated podcast script directly to the editor as ordered segments.',
      inputSchema: jsonSchema<WritingAssistantPodcastScriptWriteInput>({
        type: 'object',
        additionalProperties: false,
        properties: {
          segments: {
            type: 'array',
            description:
              'The complete ordered podcast script after applying the rewrite.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                speaker: speakerSchema,
                line: {
                  type: 'string',
                  description:
                    'Dialogue text for this segment. Keep inline punctuation and colon text inside the line.',
                },
                index: {
                  type: 'integer',
                  description:
                    'Zero-based position of the segment in the rewritten script.',
                },
              },
              required: ['speaker', 'line', 'index'],
            },
          },
        },
        required: ['segments'],
      }),
      outputSchema: jsonSchema<WritingAssistantPodcastScriptWriteResult>({
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { type: 'string', enum: ['applied'] },
          appliedSegments: {
            type: 'array',
            description: 'Segments written to the editor after the tool call.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                speaker: { type: 'string' },
                line: { type: 'string' },
                index: { type: 'integer' },
              },
              required: ['speaker', 'line', 'index'],
            },
          },
        },
        required: ['status', 'appliedSegments'],
      }),
    }),
  } as const;
}

function normalizeDraftForPrompt(draft: string) {
  const trimmedDraft = draft.trim();
  if (trimmedDraft.length === 0) {
    return '[Draft is currently empty]';
  }

  const truncatedDraft = trimmedDraft.slice(
    0,
    WRITING_ASSISTANT_DRAFT_MAX_CONTEXT_CHARS,
  );
  if (truncatedDraft === trimmedDraft) {
    return trimmedDraft;
  }

  return `${truncatedDraft}\n\n[Draft truncated for context length]`;
}

function getCurrentTurnUserMessageText(messages: readonly UIMessage[]) {
  const latestMessage = messages.at(-1);
  if (!latestMessage || latestMessage.role !== 'user') {
    return '';
  }

  return getMessageText(latestMessage);
}

function matchesAnyPattern(
  value: string,
  patterns: readonly RegExp[],
): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function shouldForceRewriteTool(messages: readonly UIMessage[]) {
  const latestUserMessageText = getCurrentTurnUserMessageText(messages).trim();
  if (latestUserMessageText.length === 0) {
    return false;
  }

  if (
    matchesAnyPattern(latestUserMessageText, DISCUSSION_ONLY_REQUEST_PATTERNS)
  ) {
    return false;
  }

  return matchesAnyPattern(
    latestUserMessageText,
    DIRECT_REWRITE_REQUEST_PATTERNS,
  );
}

function selectVoiceoverToolChoice(messages: readonly UIMessage[]) {
  if (!shouldForceRewriteTool(messages)) {
    return undefined;
  }

  return {
    type: 'tool',
    toolName: DRAFT_WRITE_TOOL,
  } satisfies ToolChoice<typeof voiceoverWritingAssistantTools>;
}

function selectPodcastToolChoice(
  messages: readonly UIMessage[],
  tools: ReturnType<typeof createPodcastWritingAssistantTools>,
) {
  if (!shouldForceRewriteTool(messages)) {
    return undefined;
  }

  return {
    type: 'tool',
    toolName: PODCAST_WRITE_TOOL,
  } satisfies ToolChoice<typeof tools>;
}

export const streamWritingAssistantChat = (
  input: StreamWritingAssistantChatInput,
) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const promptDraft = normalizeDraftForPrompt(input.draft);

    if (input.documentKind === 'podcast') {
      const tools = createPodcastWritingAssistantTools(input.speakerNames ?? []);
      const toolChoice = selectPodcastToolChoice(input.messages, tools);

      return yield* llm.streamText({
        system: renderPrompt(chatWritingAssistantSystemPrompt, {
          documentKind: input.documentKind,
          draft: promptDraft,
          speakerNames: input.speakerNames ?? [],
        }),
        messages: input.messages,
        tools,
        toolChoice,
        maxTokens: 1024,
        temperature: 0.7,
      });
    }

    const toolChoice = selectVoiceoverToolChoice(input.messages);

    return yield* llm.streamText({
      system: renderPrompt(chatWritingAssistantSystemPrompt, {
        documentKind: input.documentKind,
        draft: promptDraft,
        speakerNames: input.speakerNames ?? [],
      }),
      messages: input.messages,
      tools: voiceoverWritingAssistantTools,
      toolChoice,
      maxTokens: 1024,
      temperature: 0.7,
    });
  }).pipe(
    withAIUsageScope({ operation: 'useCase.streamWritingAssistantChat' }),
    Effect.withSpan('useCase.streamWritingAssistantChat', {
      attributes: {
        'chat.messageCount': input.messages.length,
        'chat.documentKind': input.documentKind,
        'chat.draftChars': input.draft.length,
        'chat.speakerCount': input.speakerNames?.length ?? 0,
      },
    }),
  );
