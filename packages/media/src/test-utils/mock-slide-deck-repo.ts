import { Effect, Layer } from 'effect';
import {
  SlideDeckRepo,
  type SlideDeckRepoService,
} from '../slide-deck/repos/slide-deck-repo';

/**
 * Create a mock SlideDeckRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockSlideDeckRepo = (
  overrides: Partial<SlideDeckRepoService> = {},
): Layer.Layer<SlideDeckRepo> => {
  const defaults: SlideDeckRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    findByIdForUser: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    insertVersion: () => Effect.die('not implemented'),
    listVersions: () => Effect.die('not implemented'),
    deleteOldVersions: () => Effect.die('not implemented'),
  };

  const findByIdForUser =
    overrides.findByIdForUser ??
    (overrides.findById
      ? (id: string, _userId: string) =>
          overrides.findById!(id) as ReturnType<
            SlideDeckRepoService['findByIdForUser']
          >
      : defaults.findByIdForUser);

  return Layer.succeed(SlideDeckRepo, {
    ...defaults,
    ...overrides,
    findByIdForUser,
  });
};
