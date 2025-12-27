import { Effect } from 'effect';
import type { Podcast, UpdatePodcast } from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/effect/db';
import { PodcastNotFound, ScriptNotFound } from '@repo/effect/errors';
import { PodcastRepo } from '../repos/podcast-repo';
import { ScriptVersionRepo, type VersionStatus } from '../repos/script-version-repo';
import { detectEditType, determineNewVersionStatus } from '../utils/state-machine';

// =============================================================================
// Types
// =============================================================================

export interface UpdatePodcastInput {
  podcastId: string;
  data: UpdatePodcast;
}

export interface UpdatePodcastResult {
  podcast: Podcast;
  newVersionCreated: boolean;
  newVersionStatus?: VersionStatus;
}

export type UpdatePodcastError = PodcastNotFound | ScriptNotFound | DatabaseError;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Update a podcast with smart version transitions.
 *
 * This use case detects what changed and creates a new version if needed:
 * - Segments edit → new version at 'script_ready' (audio outdated)
 * - Voice change → new version at 'script_ready' (need new audio)
 * - Prompt/docs change → new version at 'draft' (need new script)
 * - Metadata only → no new version needed
 *
 * @example
 * // Update title (no new version)
 * const result = yield* updatePodcast({
 *   podcastId: 'podcast-123',
 *   data: { title: 'New Title' },
 * });
 *
 * // Change voice (creates new version at script_ready)
 * const result = yield* updatePodcast({
 *   podcastId: 'podcast-123',
 *   data: { hostVoice: 'Kore' },
 * });
 */
export const updatePodcast = (
  input: UpdatePodcastInput,
): Effect.Effect<UpdatePodcastResult, UpdatePodcastError, PodcastRepo | ScriptVersionRepo | Db> =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;

    // 1. Get current podcast state
    const currentPodcast = yield* podcastRepo.findByIdFull(input.podcastId);
    const currentVersion = currentPodcast.activeVersion;

    // 2. Detect what changed (note: documentIds in input maps to sourceDocumentIds in DB)
    const changedFields = {
      hostVoice: input.data.hostVoice !== undefined && input.data.hostVoice !== currentPodcast.hostVoice,
      coHostVoice:
        input.data.coHostVoice !== undefined && input.data.coHostVoice !== currentPodcast.coHostVoice,
      promptInstructions:
        input.data.promptInstructions !== undefined &&
        input.data.promptInstructions !== currentPodcast.promptInstructions,
      sourceDocumentIds:
        input.data.documentIds !== undefined &&
        JSON.stringify(input.data.documentIds) !==
          JSON.stringify(currentPodcast.sourceDocumentIds),
      title: input.data.title !== undefined && input.data.title !== currentPodcast.title,
      description:
        input.data.description !== undefined && input.data.description !== currentPodcast.description,
      tags:
        input.data.tags !== undefined &&
        JSON.stringify(input.data.tags) !== JSON.stringify(currentPodcast.tags),
    };

    const editType = detectEditType(changedFields);
    const newVersionStatus = determineNewVersionStatus(editType);

    // 3. Update podcast metadata (including sourceDocumentIds if changed)
    const updatedPodcast = yield* podcastRepo.update(input.podcastId, input.data);

    // 4. Create new version if needed
    if (newVersionStatus !== null && currentVersion) {
      // Deactivate current version
      yield* scriptVersionRepo.deactivateAll(input.podcastId);

      // Create new version with appropriate status
      yield* scriptVersionRepo.insert({
        podcastId: input.podcastId,
        status: newVersionStatus,
        // Copy segments only if status is script_ready (segments still valid)
        segments: newVersionStatus === 'script_ready' ? currentVersion.segments : null,
        sourceDocumentIds: input.data.documentIds ?? currentPodcast.sourceDocumentIds,
        hostVoice: input.data.hostVoice ?? currentPodcast.hostVoice,
        coHostVoice: input.data.coHostVoice ?? currentPodcast.coHostVoice,
        promptInstructions: input.data.promptInstructions ?? currentPodcast.promptInstructions,
      });

      return {
        podcast: updatedPodcast,
        newVersionCreated: true,
        newVersionStatus,
      };
    }

    return {
      podcast: updatedPodcast,
      newVersionCreated: false,
    };
  }).pipe(
    Effect.withSpan('useCase.updatePodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
