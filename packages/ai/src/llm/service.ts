import { Context } from 'effect';
import type { LLMError, LLMRateLimitError } from '../errors';
import type { LLMModelId } from '../models';
import type { ToolChoice, ToolSet, UIMessage, UIMessageChunk } from 'ai';
import type { Schema, Effect } from 'effect';

/**
 * Options for structured object generation.
 */
export interface GenerateOptions<T> {
  readonly system?: string;
  readonly prompt: string;
  readonly schema: Schema.Schema<T>;
  readonly model?: LLMModelId;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

/**
 * Options for streaming text/chat output.
 */
export interface StreamTextOptions<TOOLS extends ToolSet = ToolSet> {
  readonly system?: string;
  readonly messages: UIMessage[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly tools?: TOOLS;
  readonly toolChoice?: ToolChoice<TOOLS>;
}

/**
 * Result from object generation.
 */
export interface GenerateResult<T> {
  readonly object: T;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
  };
}

/**
 * LLM service interface using AI SDK.
 * Provider-agnostic - works with OpenAI, Anthropic, Google, etc.
 */
export interface LLMService {
  /**
   * Generate a typed object from a prompt using Effect Schema.
   */
  readonly generate: <T>(
    options: GenerateOptions<T>,
  ) => Effect.Effect<GenerateResult<T>, LLMError | LLMRateLimitError>;

  /**
   * Stream chat/text output as UI message chunks.
   */
  readonly streamText: <TOOLS extends ToolSet = ToolSet>(
    options: StreamTextOptions<TOOLS>,
  ) => Effect.Effect<
    ReadableStream<UIMessageChunk>,
    LLMError | LLMRateLimitError
  >;
}

/**
 * LLM service Context.Tag for dependency injection.
 */
export class LLM extends Context.Tag('@repo/ai/LLM')<LLM, LLMService>() {}
