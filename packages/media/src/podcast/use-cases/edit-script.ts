import { Effect } from 'effect';
import type { PodcastScript } from '@repo/db/schema';
import { ScriptNotFound } from '../../errors';
import { PodcastRepo } from '../repos/podcast-repo';
import {
  ScriptVersionRepo,
  type VersionStatus,
} from '../repos/script-version-repo';

// =============================================================================
// Types
// =============================================================================

export interface ScriptSegment {
  speaker: string;
  line: string;
  index: number;
}

export interface EditScriptInput {
  podcastId: string;
  segments: ScriptSegment[];
}

export interface EditScriptResult {
  version: PodcastScript;
  previousVersionId: string | null;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Edit a podcast script by creating a new version with updated segments.
 *
 * This use case:
 * 1. Loads the current active version
 * 2. Deactivates the current version
 * 3. Creates a new version with:
 *    - Updated segments
 *    - Status: 'script_ready' (audio needs regeneration)
 *    - Copied metadata from previous version
 *
 * @example
 * const result = yield* editScript({
 *   podcastId: 'podcast-123',
 *   segments: [
 *     { speaker: 'Host', line: 'Welcome to the show!', index: 0 },
 *     { speaker: 'Co-Host', line: 'Great to be here!', index: 1 },
 *   ],
 * });
 */
export const editScript = (input: EditScriptInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;

    // 1. Verify podcast exists and get current state
    const podcast = yield* podcastRepo.findByIdFull(input.podcastId);
    const currentVersion = podcast.activeVersion;

    if (!currentVersion) {
      return yield* Effect.fail(
        new ScriptNotFound({
          podcastId: input.podcastId,
          message: 'No active version found',
        }),
      );
    }

    const previousVersionId = currentVersion.id;

    // 2. Deactivate current version
    yield* scriptVersionRepo.deactivateAll(input.podcastId);

    // 3. Create new version with updated segments
    const newVersion = yield* scriptVersionRepo.insert({
      podcastId: input.podcastId,
      createdBy: podcast.createdBy,
      status: 'script_ready' as VersionStatus,
      segments: input.segments,
      summary: currentVersion.summary,
      generationPrompt: currentVersion.generationPrompt,
    });

    return {
      version: newVersion,
      previousVersionId,
    };
  }).pipe(
    Effect.withSpan('useCase.editScript', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
