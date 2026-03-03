import { TTS, type SpeakerTurn, type SpeakerVoiceConfig } from '@repo/ai/tts';
import { getCurrentUser } from '@repo/auth/policy';
import {
  VersionStatus,
  type Podcast,
  type ScriptSegment,
} from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect, Schema } from 'effect';
import { loadPersonaByIdSafe } from '../../persona';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

const failInvalidAudioGeneration = (
  podcastId: string,
  currentStatus: string,
  message: string,
) =>
  Effect.fail(
    new InvalidAudioGenerationError({
      podcastId,
      currentStatus,
      message,
    }),
  );
const loadPersonaName = (personaId: string | null | undefined) =>
  personaId
    ? loadPersonaByIdSafe(personaId).pipe(
        Effect.map((persona) => persona?.name.toLowerCase()),
      )
    : Effect.succeed<string | undefined>(undefined);

export const generateAudio = (input: GenerateAudioInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;
    const tts = yield* TTS;
    const storage = yield* Storage;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    const podcast = yield* podcastRepo.findByIdForUser(
      input.podcastId,
      user.id,
    );

    if (podcast.status !== VersionStatus.SCRIPT_READY) {
      return yield* failInvalidAudioGeneration(
        input.podcastId,
        podcast.status,
        `Cannot generate audio from status '${podcast.status}'. Podcast must be in 'script_ready' status.`,
      );
    }

    if (!podcast.segments || podcast.segments.length === 0) {
      return yield* failInvalidAudioGeneration(
        input.podcastId,
        podcast.status,
        'Podcast has no script segments to generate audio from.',
      );
    }

    yield* podcastRepo.updateStatus(
      input.podcastId,
      VersionStatus.GENERATING_AUDIO,
    );

    const [hostPersonaName, coHostPersonaName] = yield* Effect.all(
      [
        loadPersonaName(podcast.hostPersonaId),
        loadPersonaName(podcast.coHostPersonaId),
      ],
      { concurrency: 2 },
    );

    const hostVoice = podcast.hostVoice ?? 'Charon';
    const coHostVoice = podcast.coHostVoice ?? 'Kore';

    const isCoHost = (speakerName: string) => {
      const lower = speakerName.toLowerCase();
      // Check persona names first
      if (coHostPersonaName && lower.includes(coHostPersonaName)) return true;
      if (hostPersonaName && lower.includes(hostPersonaName)) return false;
      // Fall back to existing heuristics
      return (
        lower.includes('cohost') ||
        lower.includes('co-host') ||
        lower.includes('co host') ||
        lower === 'guest'
      );
    };

    const turns: SpeakerTurn[] = podcast.segments.map(
      (segment: ScriptSegment) => ({
        speaker: isCoHost(segment.speaker) ? 'cohost' : 'host',
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
      VersionStatus.READY,
    );

    return { podcast: updatedPodcast, audioUrl, duration };
  }).pipe(
    Effect.catchTag('TTSError', (error) =>
      Effect.gen(function* () {
        const podcastRepo = yield* PodcastRepo;
        yield* podcastRepo.updateStatus(
          input.podcastId,
          VersionStatus.FAILED,
          error.message,
        );
        return yield* Effect.fail(error);
      }),
    ),
    withUseCaseSpan('useCase.generateAudio'),
  );
