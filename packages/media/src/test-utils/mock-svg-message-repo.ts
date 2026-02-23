import { Effect, Layer } from 'effect';
import {
  SvgMessageRepo,
  type SvgMessageRepoService,
} from '../svg/repos/svg-message-repo';

/**
 * Create a mock SvgMessageRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockSvgMessageRepo = (
  overrides: Partial<SvgMessageRepoService> = {},
): Layer.Layer<SvgMessageRepo> => {
  const defaults: SvgMessageRepoService = {
    listBySvgId: () => Effect.die('not implemented'),
    insert: () => Effect.die('not implemented'),
  };

  return Layer.succeed(SvgMessageRepo, { ...defaults, ...overrides });
};
