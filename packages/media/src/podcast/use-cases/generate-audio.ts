import { Effect, Schema } from 'effect';
import type { Podcast, VersionStatus, ScriptSegment } from '@repo/db/schema';
import { TTS, type SpeakerTurn, type SpeakerVoiceConfig } from '@repo/ai/tts';
import { Storage } from '@repo/storage';
import { requireOwnership } from '@repo/auth/policy';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface GenerateAudioInput {
  podcastId: string;
}

export interface GenerateAudioResult {
  podcast: Podcast;
  audioUrl: string;
  duration: number;
}

/**
 * Error when audio generation is not possible from current state.
 */
export class InvalidAudioGenerationError extends Schema.TaggedError<InvalidAudioGenerationError>()(
  'InvalidAudioGenerationError',
  {
    podcastId: Schema.String,
    currentStatus: Schema.String,
    message: Schema.String,
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'INVALID_AUDIO_GENERATION' as const;
  static readonly httpMessage = (e: InvalidAudioGenerationError) => e.message;
  static readonly logLevel = 'warn' as const;

  static getData(e: InvalidAudioGenerationError) {
    return { podcastId: e.podcastId, currentStatus: e.currentStatus };
  }
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Generate audio for a podcast.
 *
 * This use case:
 * 1. Validates podcast is in 'script_ready' status
 * 2. Updates status to 'generating_audio'
 * 3. Converts segments to TTS turns format
 * 4. Synthesizes audio via multi-speaker TTS
 * 5. Uploads to storage
 * 6. Updates podcast with audio URL and 'ready' status
 *
 * @example
 * const result = yield* generateAudio({ podcastId: 'podcast-123' });
 */
export const generateAudio = (input: GenerateAudioInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const tts = yield* TTS;
    const storage = yield* Storage;

    // 1. Load podcast and validate state
    const podcast = yield* podcastRepo.findById(input.podcastId);
    yield* requireOwnership(podcast.createdBy);

    if (podcast.status !== 'script_ready') {
      return yield* Effect.fail(
        new InvalidAudioGenerationError({
          podcastId: input.podcastId,
          currentStatus: podcast.status,
          message: `Cannot generate audio from status '${podcast.status}'. Podcast must be in 'script_ready' status.`,
        }),
      );
    }

    if (!podcast.segments || podcast.segments.length === 0) {
      return yield* Effect.fail(
        new InvalidAudioGenerationError({
          podcastId: input.podcastId,
          currentStatus: podcast.status,
          message: 'Podcast has no script segments to generate audio from.',
        }),
      );
    }

    // 2. Update status to generating
    yield* podcastRepo.updateStatus(input.podcastId, 'generating_audio');

    // 3. Determine voices (from podcast config)
    const hostVoice = podcast.hostVoice ?? 'Charon';
    const coHostVoice = podcast.coHostVoice ?? 'Kore';

    // 4. Convert segments to TTS format
    const turns: SpeakerTurn[] = podcast.segments.map(
      (segment: ScriptSegment) => ({
        speaker: segment.speaker.toLowerCase().includes('host')
          ? 'host'
          : 'cohost',
        text: segment.line,
      }),
    );

    const voiceConfigs: SpeakerVoiceConfig[] = [
      { speakerAlias: 'host', voiceId: hostVoice },
      { speakerAlias: 'cohost', voiceId: coHostVoice },
    ];

    // 5. Synthesize audio
    const ttsResult = yield* tts.synthesize({
      turns,
      voiceConfigs,
    });

    // 6. Upload to storage
    const audioKey = `podcasts/${podcast.id}/audio.wav`;
    yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/wav');
    const audioUrl = yield* storage.getUrl(audioKey);

    // 7. Estimate duration (WAV 24kHz 16-bit mono = 48KB/sec)
    const duration = Math.round(ttsResult.audioContent.length / 48000);

    // 8. Update podcast with audio URL and ready status
    yield* podcastRepo.updateAudio(input.podcastId, { audioUrl, duration });
    const updatedPodcast = yield* podcastRepo.updateStatus(
      input.podcastId,
      'ready',
    );

    return {
      podcast: updatedPodcast,
      audioUrl,
      duration,
    };
  }).pipe(
    Effect.catchTag('TTSError', (error) =>
      // On TTS failure, mark podcast as failed
      Effect.gen(function* () {
        const podcastRepo = yield* PodcastRepo;
        yield* podcastRepo.updateStatus(
          input.podcastId,
          'failed',
          error.message,
        );
        return yield* Effect.fail(error);
      }),
    ),
    Effect.withSpan('useCase.generateAudio', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
