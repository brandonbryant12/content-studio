import { Layer } from 'effect';
import { GoogleAILive, VertexAILive, type AI, type AIProvider } from '@repo/ai';

export interface AILayerOptions {
  readonly provider: AIProvider;
  readonly apiKey: string;
  readonly model?: string;
}

export const createAILayer = (options: AILayerOptions): Layer.Layer<AI> => {
  if (options.provider === 'vertex') {
    return VertexAILive({
      mode: 'express',
      apiKey: options.apiKey,
      llmModel: options.model,
    });
  }

  return GoogleAILive({
    apiKey: options.apiKey,
    llmModel: options.model,
  });
};
