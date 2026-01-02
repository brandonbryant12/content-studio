import { Effect } from 'effect';
import type { PodcastScript } from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/db/effect';
import { ScriptNotFound } from '@repo/db/errors';
import { ScriptVersionRepo } from '../repos/script-version-repo';

// =============================================================================
// Types
// =============================================================================

export interface GetActiveScriptInput {
  podcastId: string;
}

export type GetActiveScriptError = ScriptNotFound | DatabaseError;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get the active script version for a podcast.
 *
 * @example
 * const script = yield* getActiveScript({ podcastId: 'podcast-123' });
 */
export const getActiveScript = (
  input: GetActiveScriptInput,
): Effect.Effect<PodcastScript, GetActiveScriptError, ScriptVersionRepo | Db> =>
  Effect.gen(function* () {
    const scriptVersionRepo = yield* ScriptVersionRepo;

    const version = yield* scriptVersionRepo.findActiveByPodcastId(input.podcastId);

    if (!version) {
      return yield* Effect.fail(
        new ScriptNotFound({
          podcastId: input.podcastId,
          message: 'No active script found',
        }),
      );
    }

    return version;
  }).pipe(
    Effect.withSpan('useCase.getActiveScript', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
