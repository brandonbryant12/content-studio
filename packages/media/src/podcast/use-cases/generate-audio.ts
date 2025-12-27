import { Effect } from 'effect';
import type { PodcastScript } from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/effect/db';
import {
  PodcastNotFound,
  ScriptNotFound,
  TTSError,
  TTSQuotaExceededError,
  StorageError,
  StorageUploadError,
} from '@repo/effect/errors';
import { TTS, type SpeakerTurn, type SpeakerVoiceConfig } from '@repo/ai/tts';
import { Storage } from '@repo/storage';
import { PodcastRepo } from '../repos/podcast-repo';
import { ScriptVersionRepo, type VersionStatus } from '../repos/script-version-repo';

// =============================================================================
// Types
// =============================================================================

export interface GenerateAudioInput {
  versionId: string;
}

export interface GenerateAudioResult {
  version: PodcastScript;
  audioUrl: string;
  duration: number;
}

export type GenerateAudioError =
  | PodcastNotFound
  | ScriptNotFound
  | TTSError
  | TTSQuotaExceededError
  | StorageError
  | StorageUploadError
  | DatabaseError
  | InvalidAudioGenerationError;

/**
 * Error when audio generation is not possible from current state.
 */
export class InvalidAudioGenerationError {
  readonly _tag = 'InvalidAudioGenerationError';
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
 * Generate audio for a podcast version.
 *
 * This use case:
 * 1. Validates version is in 'script_ready' status
 * 2. Updates status to 'generating_audio'
 * 3. Converts segments to TTS turns format
 * 4. Synthesizes audio via multi-speaker TTS
 * 5. Uploads to storage
 * 6. Updates version with audio URL and 'audio_ready' status
 *
 * @example
 * const result = yield* generateAudio({ versionId: 'version-123' });
 */
export const generateAudio = (
  input: GenerateAudioInput,
): Effect.Effect<
  GenerateAudioResult,
  GenerateAudioError,
  PodcastRepo | ScriptVersionRepo | TTS | Storage | Db
> =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;
    const tts = yield* TTS;
    const storage = yield* Storage;

    // 1. Load version and validate state
    const version = yield* scriptVersionRepo.findById(input.versionId);

    if (version.status !== 'script_ready') {
      return yield* Effect.fail(
        new InvalidAudioGenerationError(
          input.versionId,
          version.status,
          `Cannot generate audio from status '${version.status}'. Version must be in 'script_ready' status.`,
        ),
      );
    }

    if (!version.segments || version.segments.length === 0) {
      return yield* Effect.fail(
        new InvalidAudioGenerationError(
          input.versionId,
          version.status,
          'Version has no script segments to generate audio from.',
        ),
      );
    }

    // 2. Load podcast for voice configuration
    const podcast = yield* podcastRepo.findById(version.podcastId);

    // 3. Update status to generating
    yield* scriptVersionRepo.updateStatus(input.versionId, 'generating_audio');

    // 4. Determine voices
    const hostVoice = version.hostVoice ?? podcast.hostVoice ?? 'Charon';
    const coHostVoice = version.coHostVoice ?? podcast.coHostVoice ?? 'Kore';

    // 5. Convert segments to TTS format
    const turns: SpeakerTurn[] = version.segments.map((segment) => ({
      speaker: segment.speaker.toLowerCase().includes('host') ? 'host' : 'cohost',
      text: segment.line,
    }));

    const voiceConfigs: SpeakerVoiceConfig[] = [
      { speakerAlias: 'host', voiceId: hostVoice },
      { speakerAlias: 'cohost', voiceId: coHostVoice },
    ];

    // 6. Synthesize audio
    const ttsResult = yield* tts.synthesize({
      turns,
      voiceConfigs,
    });

    // 7. Upload to storage
    const audioKey = `podcasts/${version.podcastId}/audio-v${version.version}.wav`;
    yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/wav');
    const audioUrl = yield* storage.getUrl(audioKey);

    // 8. Estimate duration (WAV 24kHz 16-bit mono = 48KB/sec)
    const duration = Math.round(ttsResult.audioContent.length / 48000);

    // 9. Update version with audio URL and ready status
    const updatedVersion = yield* scriptVersionRepo.update(input.versionId, {
      status: 'audio_ready' as VersionStatus,
      audioUrl,
      duration,
    });

    return {
      version: updatedVersion,
      audioUrl,
      duration,
    };
  }).pipe(
    Effect.catchTag('TTSError', (error) =>
      // On TTS failure, mark version as failed
      Effect.gen(function* () {
        const scriptVersionRepo = yield* ScriptVersionRepo;
        yield* scriptVersionRepo.updateStatus(input.versionId, 'failed', error.message);
        return yield* Effect.fail(error);
      }),
    ),
    Effect.withSpan('useCase.generateAudio', {
      attributes: { 'version.id': input.versionId },
    }),
  );
