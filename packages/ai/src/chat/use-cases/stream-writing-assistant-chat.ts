import { jsonSchema, tool, type UIMessage, type ToolSet } from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';
import {
  chatWritingAssistantSystemPrompt,
  renderPrompt,
} from '../../prompt-registry';
import { withAIUsageScope } from '../../usage';

const WRITING_ASSISTANT_TRANSCRIPT_MAX_CONTEXT_CHARS = 12_000;

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

export const streamWritingAssistantChat = (
  input: StreamWritingAssistantChatInput,
) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const promptTranscript = normalizeTranscriptForPrompt(input.transcript);
    return yield* llm.streamText({
      system: renderPrompt(chatWritingAssistantSystemPrompt, {
        transcript: promptTranscript,
      }),
      messages: input.messages,
      tools: writingAssistantTools,
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
