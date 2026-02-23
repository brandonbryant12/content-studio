import { Effect, Layer } from 'effect';
import { SvgRepo, type SvgRepoService } from '../svg/repos/svg-repo';

/**
 * Create a mock SvgRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockSvgRepo = (
  overrides: Partial<SvgRepoService> = {},
): Layer.Layer<SvgRepo> => {
  const defaults: SvgRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    findByIdForUser: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    tryAcquireGenerationLock: () => Effect.die('not implemented'),
    completeGeneration: () => Effect.die('not implemented'),
    failGeneration: () => Effect.die('not implemented'),
  };

  const findByIdForUser =
    overrides.findByIdForUser ??
    (overrides.findById
      ? (id: string, _userId: string) =>
          overrides.findById!(id) as ReturnType<
            SvgRepoService['findByIdForUser']
          >
      : defaults.findByIdForUser);

  return Layer.succeed(SvgRepo, {
    ...defaults,
    ...overrides,
    findByIdForUser,
  });
};
