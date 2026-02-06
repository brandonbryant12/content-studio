import { Effect, Schema } from 'effect';
import type { Podcast, ScriptSegment, VersionStatus } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { PodcastRepo } from '../repos/podcast-repo';
import { CollaboratorRepo } from '../repos/collaborator-repo';

// =============================================================================
// Types
// =============================================================================

export interface SaveChangesInput {
  podcastId: string;
  segments?: ScriptSegment[];
  hostVoice?: string;
  hostVoiceName?: string;
  coHostVoice?: string;
  coHostVoiceName?: string;
}

export interface SaveChangesResult {
  podcast: Podcast;
  hasChanges: boolean;
}

/**
 * Error when save is not possible from current state.
 */
export class InvalidSaveError extends Schema.TaggedError<InvalidSaveError>()(
  'InvalidSaveError',
  {
    podcastId: Schema.String,
    currentStatus: Schema.String,
    message: Schema.String,
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'INVALID_SAVE' as const;
  static readonly httpMessage = (e: InvalidSaveError) => e.message;
  static readonly logLevel = 'warn' as const;

  static getData(e: InvalidSaveError) {
    return { podcastId: e.podcastId, currentStatus: e.currentStatus };
  }
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Save changes to a podcast (script segments and/or voice settings).
 * Only allowed when podcast is in 'ready' status.
 *
 * This use case:
 * 1. Validates podcast is in 'ready' status
 * 2. Updates script segments in place (if provided)
 * 3. Updates podcast voice settings (if provided)
 * 4. Sets status to 'script_ready' for audio regeneration
 * 5. Clears audio since it needs regeneration
 *
 * After calling this, the handler should queue an audio generation job.
 *
 * @example
 * const result = yield* saveChanges({
 *   podcastId: 'podcast-123',
 *   segments: [{ speaker: 'Host', line: 'Updated line', index: 0 }],
 *   hostVoice: 'Kore',
 * });
 * // Then queue audio generation job
 */
export const saveChanges = (input: SaveChangesInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const collaboratorRepo = yield* CollaboratorRepo;

    // 1. Load podcast and check ownership
    const podcast = yield* podcastRepo.findById(input.podcastId);
    yield* requireOwnership(podcast.createdBy);

    // 2. Validate status is 'ready'
    if (podcast.status !== 'ready') {
      return yield* Effect.fail(
        new InvalidSaveError({
          podcastId: podcast.id,
          currentStatus: podcast.status,
          message: `Cannot save changes when status is '${podcast.status}'. Podcast must be in 'ready' status.`,
        }),
      );
    }

    // 3. Check if there are any changes
    const hasSegmentChanges = input.segments !== undefined;
    const hasVoiceChanges =
      input.hostVoice !== undefined ||
      input.hostVoiceName !== undefined ||
      input.coHostVoice !== undefined ||
      input.coHostVoiceName !== undefined;

    const hasChanges = hasSegmentChanges || hasVoiceChanges;

    if (!hasChanges) {
      // No changes to save
      return {
        podcast,
        hasChanges: false,
      };
    }

    // 4. Update podcast voice settings if provided
    if (hasVoiceChanges) {
      yield* podcastRepo.update(input.podcastId, {
        ...(input.hostVoice !== undefined && { hostVoice: input.hostVoice }),
        ...(input.hostVoiceName !== undefined && {
          hostVoiceName: input.hostVoiceName,
        }),
        ...(input.coHostVoice !== undefined && {
          coHostVoice: input.coHostVoice,
        }),
        ...(input.coHostVoiceName !== undefined && {
          coHostVoiceName: input.coHostVoiceName,
        }),
      });
    }

    // 5. Update script segments if provided
    if (hasSegmentChanges) {
      yield* podcastRepo.updateScript(input.podcastId, {
        segments: input.segments,
      });
    }

    // 6. Clear audio and set status to script_ready for audio regeneration
    yield* podcastRepo.clearAudio(input.podcastId);
    const updatedPodcast = yield* podcastRepo.updateStatus(
      input.podcastId,
      'script_ready',
    );

    // 7. Clear all approvals (owner and collaborators) since content changed
    yield* podcastRepo.clearApprovals(input.podcastId);
    yield* collaboratorRepo.clearAllApprovals(podcast.id);

    return {
      podcast: updatedPodcast,
      hasChanges: true,
    };
  }).pipe(
    Effect.withSpan('useCase.saveChanges', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
