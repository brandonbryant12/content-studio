import { Context, Effect, Layer } from 'effect';
import { DeepResearchDisabled } from '../../errors';

export interface DeepResearchFeatureService {
  readonly enabled: boolean;
}

export class DeepResearchFeature extends Context.Tag(
  '@repo/media/DeepResearchFeature',
)<DeepResearchFeature, DeepResearchFeatureService>() {}

export const DeepResearchFeatureLive = (
  enabled: boolean,
): Layer.Layer<DeepResearchFeature, never, never> =>
  Layer.succeed(DeepResearchFeature, { enabled });

export const ensureDeepResearchEnabled: Effect.Effect<
  void,
  DeepResearchDisabled,
  DeepResearchFeature
> = Effect.gen(function* () {
  const deepResearchFeature = yield* DeepResearchFeature;

  if (!deepResearchFeature.enabled) {
    return yield* new DeepResearchDisabled({
      message: 'Deep research is currently disabled',
    });
  }
});
