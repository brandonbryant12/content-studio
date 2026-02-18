import { Effect, Layer } from 'effect';
import {
  StylePresetRepo,
  type StylePresetRepoService,
} from '../infographic/repos/style-preset-repo';

/**
 * Create a mock StylePresetRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockStylePresetRepo = (
  overrides: Partial<StylePresetRepoService> = {},
): Layer.Layer<StylePresetRepo> => {
  const defaults: StylePresetRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
  };

  return Layer.succeed(StylePresetRepo, { ...defaults, ...overrides });
};
