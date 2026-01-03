import { Effect } from 'effect';
import type { PodcastScript, ScriptSegment } from '@repo/db/schema';
import { ScriptNotFound } from '../../errors';
import { PodcastRepo } from '../repos/podcast-repo';
import {
  ScriptVersionRepo,
  type VersionStatus,
} from '../repos/script-version-repo';

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
  version: PodcastScript;
  hasChanges: boolean;
}

/**
 * Error when save is not possible from current state.
 */
export class InvalidSaveError {
  readonly _tag = 'InvalidSaveError';

  // HTTP Protocol
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'INVALID_SAVE' as const;
  static readonly httpMessage = (e: InvalidSaveError) => e.message;
  static readonly logLevel = 'warn' as const;

  static getData(e: InvalidSaveError) {
    return { versionId: e.versionId, currentStatus: e.currentStatus };
  }

  constructor(
    readonly versionId: string,
    readonly currentStatus: VersionStatus,
    readonly message: string,
  ) {}
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Save changes to a podcast (script segments and/or voice settings).
 * Only allowed when podcast is in 'ready' status.
 *
 * This use case:
 * 1. Validates version is in 'ready' status
 * 2. Updates script segments in place (if provided)
 * 3. Updates podcast voice settings (if provided)
 * 4. Sets status to 'script_ready' for audio regeneration
 *
 * After calling this, the handler should queue an audio generation job.
 *
 * @example
 * const result = yield* saveChanges({
 *   podcastId: 'podcast-123',
 *   segments: [{ speaker: 'Host', line: 'Updated line', index: 0 }],
 *   hostVoice: 'Kore',
 * });
 * // Then queue audio generation job with result.version.id
 */
export const saveChanges = (input: SaveChangesInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;

    // 1. Load podcast with active version
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

    // 2. Validate status is 'ready'
    if (currentVersion.status !== 'ready') {
      return yield* Effect.fail(
        new InvalidSaveError(
          currentVersion.id,
          currentVersion.status,
          `Cannot save changes when status is '${currentVersion.status}'. Podcast must be in 'ready' status.`,
        ),
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
        version: currentVersion,
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

    // 5. Update script segments and set status to script_ready for audio regeneration
    const updatedVersion = yield* scriptVersionRepo.update(currentVersion.id, {
      status: 'script_ready' as VersionStatus,
      segments: input.segments ?? currentVersion.segments,
      // Clear audio since it needs regeneration
      audioUrl: null,
      duration: null,
    });

    return {
      version: updatedVersion,
      hasChanges: true,
    };
  }).pipe(
    Effect.withSpan('useCase.saveChanges', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
