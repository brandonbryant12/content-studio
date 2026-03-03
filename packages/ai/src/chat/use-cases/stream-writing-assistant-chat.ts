import {
  streamText,
  convertToModelMessages,
  jsonSchema,
  tool,
  type UIMessage,
  type LanguageModel,
  type ToolSet,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';
import {
  chatWritingAssistantSystemPrompt,
  renderPrompt,
} from '../../prompt-registry';

const WRITING_ASSISTANT_TRANSCRIPT_MAX_CONTEXT_CHARS = 12_000;

export interface WritingAssistantTranscriptEditProposal {
  readonly summary: string;
  readonly revisedTranscript: string;
}

export interface WritingAssistantTranscriptEditResult {
  readonly decision: 'accepted' | 'rejected';
  readonly appliedTranscript?: string;
  readonly reason?: string;
}

const writingAssistantTools = {
  proposeTranscriptEdit: tool<
    WritingAssistantTranscriptEditProposal,
    WritingAssistantTranscriptEditResult
  >({
    description:
      'Propose a transcript rewrite. Always send the full revised transcript text.',
    inputSchema: jsonSchema<WritingAssistantTranscriptEditProposal>({
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: {
          type: 'string',
          description:
            'A concise summary of what changed and why this revision helps.',
        },
        revisedTranscript: {
          type: 'string',
          description:
            'The complete revised transcript text with all edits applied.',
        },
      },
      required: ['summary', 'revisedTranscript'],
    }),
    outputSchema: jsonSchema<WritingAssistantTranscriptEditResult>({
      type: 'object',
      additionalProperties: false,
      properties: {
        decision: { type: 'string', enum: ['accepted', 'rejected'] },
        appliedTranscript: {
          type: 'string',
          description:
            'Transcript text that ended up in the editor after acceptance.',
        },
        reason: {
          type: 'string',
          description:
            'Optional user rationale for acceptance or rejection feedback.',
        },
      },
      required: ['decision'],
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

  if (trimmedTranscript.length <= WRITING_ASSISTANT_TRANSCRIPT_MAX_CONTEXT_CHARS) {
    return trimmedTranscript;
  }

  return `${trimmedTranscript.slice(0, WRITING_ASSISTANT_TRANSCRIPT_MAX_CONTEXT_CHARS)}\n\n[Transcript truncated for context length]`;
}

export const streamWritingAssistantChat = (
  input: StreamWritingAssistantChatInput,
) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const model = llm.model as LanguageModel;

    const promptTranscript = normalizeTranscriptForPrompt(input.transcript);

    const modelMessages = yield* Effect.promise(() =>
      convertToModelMessages(input.messages, {
        tools: writingAssistantTools,
      }),
    );

    const result = streamText({
      model,
      system: renderPrompt(chatWritingAssistantSystemPrompt, {
        transcript: promptTranscript,
      }),
      messages: modelMessages,
      tools: writingAssistantTools,
      maxOutputTokens: 1024,
      temperature: 0.7,
    });

    return result.toUIMessageStream();
  }).pipe(
    Effect.withSpan('useCase.streamWritingAssistantChat', {
      attributes: {
        'chat.messageCount': input.messages.length,
        'chat.transcriptChars': input.transcript.length,
      },
    }),
  );
