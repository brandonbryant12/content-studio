import { Layer } from 'effect';
import { GoogleAILive, type AI } from '@repo/ai';

export interface AILayerOptions {
  readonly apiKey: string;
  readonly model?: string;
}

export const createAILayer = (options: AILayerOptions): Layer.Layer<AI> =>
  GoogleAILive({
    apiKey: options.apiKey,
    llmModel: options.model,
  });
