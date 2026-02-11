import { Effect, Schema } from 'effect';
import type { Podcast, ScriptSegment } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { PodcastRepo } from '../repos/podcast-repo';

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

export const saveChanges = (input: SaveChangesInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    const podcast = yield* podcastRepo.findById(input.podcastId);
    yield* requireOwnership(podcast.createdBy);

    if (podcast.status !== 'ready') {
      return yield* Effect.fail(
        new InvalidSaveError({
          podcastId: podcast.id,
          currentStatus: podcast.status,
          message: `Cannot save changes when status is '${podcast.status}'. Podcast must be in 'ready' status.`,
        }),
      );
    }

    const hasSegmentChanges = input.segments !== undefined;
    const hasVoiceChanges =
      input.hostVoice !== undefined ||
      input.hostVoiceName !== undefined ||
      input.coHostVoice !== undefined ||
      input.coHostVoiceName !== undefined;

    if (!hasSegmentChanges && !hasVoiceChanges) {
      return { podcast, hasChanges: false };
    }

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

    if (hasSegmentChanges) {
      yield* podcastRepo.updateScript(input.podcastId, {
        segments: input.segments,
      });
    }

    yield* podcastRepo.clearAudio(input.podcastId);
    const updatedPodcast = yield* podcastRepo.updateStatus(
      input.podcastId,
      'script_ready',
    );
    yield* podcastRepo.clearApproval(input.podcastId);

    return { podcast: updatedPodcast, hasChanges: true };
  }).pipe(
    Effect.withSpan('useCase.saveChanges', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
