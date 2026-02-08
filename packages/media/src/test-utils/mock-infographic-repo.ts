import { Effect, Layer } from 'effect';
import {
  InfographicRepo,
  type InfographicRepoService,
} from '../infographic/repos/infographic-repo';

/**
 * Create a mock InfographicRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockInfographicRepo = (
  overrides: Partial<InfographicRepoService> = {},
): Layer.Layer<InfographicRepo> => {
  const defaults: InfographicRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    insertVersion: () => Effect.die('not implemented'),
    listVersions: () => Effect.die('not implemented'),
    deleteOldVersions: () => Effect.die('not implemented'),
  };

  return Layer.succeed(InfographicRepo, { ...defaults, ...overrides });
};
