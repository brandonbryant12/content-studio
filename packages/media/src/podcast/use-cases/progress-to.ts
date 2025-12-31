import { Effect } from 'effect';
import type { PodcastScript } from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/db/effect';
import { PodcastNotFound, ScriptNotFound } from '@repo/db/errors';
import { PodcastRepo } from '../repos/podcast-repo';
import { ScriptVersionRepo, type VersionStatus } from '../repos/script-version-repo';

// =============================================================================
// Types
// =============================================================================

export type GenerationStep = 'generate-script' | 'generate-audio';

/**
 * Calculate the steps needed to progress from current to target status.
 */
const calculateSteps = (
  current: VersionStatus,
  target: 'script_ready' | 'audio_ready',
): GenerationStep[] => {
  if (current === 'draft' && target === 'script_ready') {
    return ['generate-script'];
  }
  if (current === 'draft' && target === 'audio_ready') {
    return ['generate-script', 'generate-audio'];
  }
  if (current === 'script_ready' && target === 'audio_ready') {
    return ['generate-audio'];
  }
  return [];
};

// =============================================================================
// Types
// =============================================================================

export interface ProgressToInput {
  podcastId: string;
  targetStatus: 'script_ready' | 'audio_ready';
}

export interface ProgressToResult {
  version: PodcastScript;
  stepsRequired: GenerationStep[];
  alreadyAtTarget: boolean;
}

export type ProgressToError =
  | PodcastNotFound
  | ScriptNotFound
  | DatabaseError
  | InvalidProgressionError;

/**
 * Error when progression is not possible from current state.
 */
export class InvalidProgressionError {
  readonly _tag = 'InvalidProgressionError';
  constructor(
    readonly currentStatus: VersionStatus,
    readonly targetStatus: VersionStatus,
    readonly message: string,
  ) {}
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Calculate and execute steps to progress a podcast to a target status.
 *
 * This use case:
 * 1. Loads the active version
 * 2. Calculates required steps (generate-script, generate-audio)
 * 3. Returns the steps required (actual execution is done by the worker)
 *
 * @example
 * // Progress from draft to audio_ready
 * const result = yield* progressTo({ podcastId, targetStatus: 'audio_ready' });
 * // result.stepsRequired = ['generate-script', 'generate-audio']
 *
 * // Progress from script_ready to audio_ready
 * const result = yield* progressTo({ podcastId, targetStatus: 'audio_ready' });
 * // result.stepsRequired = ['generate-audio']
 */
export const progressTo = (
  input: ProgressToInput,
): Effect.Effect<ProgressToResult, ProgressToError, PodcastRepo | ScriptVersionRepo | Db> =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;

    // 1. Verify podcast exists
    yield* podcastRepo.findById(input.podcastId);

    // 2. Get active version (or create draft if none exists)
    let version = yield* scriptVersionRepo.findActiveByPodcastId(input.podcastId);

    if (!version) {
      // Create initial draft version
      version = yield* scriptVersionRepo.insert({
        podcastId: input.podcastId,
        status: 'draft',
        segments: null,
      });
    }

    // 3. Check if already at target
    const currentStatus = version.status;
    if (currentStatus === input.targetStatus) {
      return {
        version,
        stepsRequired: [],
        alreadyAtTarget: true,
      };
    }

    // 4. Check if progression is valid
    if (currentStatus === 'failed') {
      return yield* Effect.fail(
        new InvalidProgressionError(
          currentStatus,
          input.targetStatus,
          'Cannot progress from failed state. Create a new version or retry.',
        ),
      );
    }

    if (currentStatus === 'generating_audio') {
      return yield* Effect.fail(
        new InvalidProgressionError(
          currentStatus,
          input.targetStatus,
          'Audio generation in progress. Please wait for completion.',
        ),
      );
    }

    // 5. Calculate steps
    const stepsRequired = calculateSteps(currentStatus, input.targetStatus);

    if (stepsRequired.length === 0) {
      return yield* Effect.fail(
        new InvalidProgressionError(
          currentStatus,
          input.targetStatus,
          `Cannot progress from ${currentStatus} to ${input.targetStatus}`,
        ),
      );
    }

    return {
      version,
      stepsRequired,
      alreadyAtTarget: false,
    };
  }).pipe(
    Effect.withSpan('useCase.progressTo', {
      attributes: {
        'podcast.id': input.podcastId,
        'target.status': input.targetStatus,
      },
    }),
  );
