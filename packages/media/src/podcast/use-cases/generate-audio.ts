import { TTS, type SpeakerTurn, type SpeakerVoiceConfig } from '@repo/ai/tts';
import { requireOwnership } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect, Schema } from 'effect';
import type { Podcast, ScriptSegment } from '@repo/db/schema';
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

export const generateAudio = (input: GenerateAudioInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const tts = yield* TTS;
    const storage = yield* Storage;

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

    yield* podcastRepo.updateStatus(input.podcastId, 'generating_audio');

    const hostVoice = podcast.hostVoice ?? 'Charon';
    const coHostVoice = podcast.coHostVoice ?? 'Kore';

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

    const ttsResult = yield* tts.synthesize({ turns, voiceConfigs });

    const audioKey = `podcasts/${podcast.id}/audio-${Date.now()}.wav`;
    yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/wav');
    const audioUrl = yield* storage.getUrl(audioKey);

    // WAV 24kHz 16-bit mono = 48KB/sec
    const duration = Math.round(ttsResult.audioContent.length / 48000);

    yield* podcastRepo.updateAudio(input.podcastId, { audioUrl, duration });
    const updatedPodcast = yield* podcastRepo.updateStatus(
      input.podcastId,
      'ready',
    );

    return { podcast: updatedPodcast, audioUrl, duration };
  }).pipe(
    Effect.catchTag('TTSError', (error) =>
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
