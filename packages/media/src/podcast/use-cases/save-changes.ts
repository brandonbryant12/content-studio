import { getCurrentUser } from '@repo/auth/policy';
import {
  VersionStatus,
  type PersonaId,
  type Podcast,
  type ScriptSegment,
} from '@repo/db/schema';
import { Effect, Schema } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
  hostPersonaId?: PersonaId | null;
  coHostPersonaId?: PersonaId | null;
}

export interface SaveChangesResult {
  podcast: Podcast;
  hasChanges: boolean;
}

type VoicePersonaUpdateData = {
  hostVoice?: string;
  hostVoiceName?: string;
  coHostVoice?: string;
  coHostVoiceName?: string;
  hostPersonaId?: PersonaId | null;
  coHostPersonaId?: PersonaId | null;
};

const buildVoicePersonaUpdateData = (
  input: SaveChangesInput,
): VoicePersonaUpdateData => {
  const updateData: VoicePersonaUpdateData = {};
  if (input.hostVoice !== undefined) {
    updateData.hostVoice = input.hostVoice;
  }
  if (input.hostVoiceName !== undefined) {
    updateData.hostVoiceName = input.hostVoiceName;
  }
  if (input.coHostVoice !== undefined) {
    updateData.coHostVoice = input.coHostVoice;
  }
  if (input.coHostVoiceName !== undefined) {
    updateData.coHostVoiceName = input.coHostVoiceName;
  }
  if (input.hostPersonaId !== undefined) {
    updateData.hostPersonaId = input.hostPersonaId;
  }
  if (input.coHostPersonaId !== undefined) {
    updateData.coHostPersonaId = input.coHostPersonaId;
  }
  return updateData;
};

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
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    const podcast = yield* podcastRepo.findByIdForUser(
      input.podcastId,
      user.id,
    );

    if (podcast.status !== VersionStatus.READY) {
      return yield* Effect.fail(
        new InvalidSaveError({
          podcastId: podcast.id,
          currentStatus: podcast.status,
          message: `Cannot save changes when status is '${podcast.status}'. Podcast must be in '${VersionStatus.READY}' status.`,
        }),
      );
    }

    const hasSegmentChanges = input.segments !== undefined;
    const voicePersonaUpdateData = buildVoicePersonaUpdateData(input);
    const hasVoiceOrPersonaChanges =
      Object.keys(voicePersonaUpdateData).length > 0;

    if (!hasSegmentChanges && !hasVoiceOrPersonaChanges) {
      return { podcast, hasChanges: false };
    }

    if (hasVoiceOrPersonaChanges) {
      yield* podcastRepo.update(input.podcastId, voicePersonaUpdateData);
    }

    if (hasSegmentChanges) {
      yield* podcastRepo.updateScript(input.podcastId, {
        segments: input.segments,
      });
    }

    yield* podcastRepo.clearAudio(input.podcastId);
    const updatedPodcast = yield* podcastRepo.updateStatus(
      input.podcastId,
      VersionStatus.SCRIPT_READY,
    );
    yield* podcastRepo.clearApproval(input.podcastId);

    return { podcast: updatedPodcast, hasChanges: true };
  }).pipe(withUseCaseSpan('useCase.saveChanges'));
