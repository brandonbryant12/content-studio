import { Effect } from 'effect';
import type { PodcastScript } from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/effect/db';
import { PodcastNotFound, ScriptNotFound } from '@repo/effect/errors';
import { PodcastRepo } from '../repos/podcast-repo';
import { ScriptVersionRepo } from '../repos/script-version-repo';

// =============================================================================
// Types
// =============================================================================

export interface RestoreVersionInput {
  podcastId: string;
  versionId: string;
}

export interface RestoreVersionResult {
  restoredVersion: PodcastScript;
  previousActiveVersionId: string | null;
}

export type RestoreVersionError = PodcastNotFound | ScriptNotFound | DatabaseError;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Restore a previous version as the active version.
 *
 * This use case:
 * 1. Verifies the podcast and version exist
 * 2. Deactivates all current versions
 * 3. Activates the specified version
 *
 * The version keeps its original status, so if it was 'audio_ready',
 * the podcast will immediately have working audio again.
 *
 * @example
 * const result = yield* restoreVersion({
 *   podcastId: 'podcast-123',
 *   versionId: 'version-456',
 * });
 */
export const restoreVersion = (
  input: RestoreVersionInput,
): Effect.Effect<RestoreVersionResult, RestoreVersionError, PodcastRepo | ScriptVersionRepo | Db> =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;

    // 1. Verify podcast exists
    yield* podcastRepo.findById(input.podcastId);

    // 2. Get current active version
    const currentActive = yield* scriptVersionRepo.findActiveByPodcastId(input.podcastId);
    const previousActiveVersionId = currentActive?.id ?? null;

    // 3. Verify target version exists and belongs to this podcast
    const targetVersion = yield* scriptVersionRepo.findById(input.versionId);

    if (targetVersion.podcastId !== input.podcastId) {
      return yield* Effect.fail(
        new ScriptNotFound({
          podcastId: input.podcastId,
          message: `Version ${input.versionId} does not belong to podcast ${input.podcastId}`,
        }),
      );
    }

    // 4. Restore the version
    const restoredVersion = yield* scriptVersionRepo.restore(input.versionId);

    return {
      restoredVersion,
      previousActiveVersionId,
    };
  }).pipe(
    Effect.withSpan('useCase.restoreVersion', {
      attributes: {
        'podcast.id': input.podcastId,
        'version.id': input.versionId,
      },
    }),
  );
