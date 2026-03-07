import { GoogleAILive, type AI, type LLMModelId } from '@repo/ai';
import type { Layer } from 'effect';

export interface AILayerOptions {
  readonly apiKey: string;
  readonly model?: LLMModelId;
}

export const createAILayer = (options: AILayerOptions): Layer.Layer<AI> =>
  GoogleAILive({
    apiKey: options.apiKey,
    llmModel: options.model,
  });
