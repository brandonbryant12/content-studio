import { Effect } from 'effect';
import { VoiceoverStatus, type Voiceover } from '@repo/db/schema';
import { TTS } from '@repo/ai/tts';
import { Storage } from '@repo/storage';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';
import {
  InvalidVoiceoverAudioGeneration,
  NotVoiceoverOwner,
} from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface GenerateVoiceoverAudioInput {
  voiceoverId: string;
  userId: string;
}

export interface GenerateVoiceoverAudioResult {
  voiceover: Voiceover;
  audioUrl: string;
  duration: number;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Generate audio for a voiceover.
 *
 * This use case:
 * 1. Validates voiceover is in valid status (drafting, ready, failed, or generating_audio)
 *    - generating_audio is valid when called from worker after start-generation
 * 2. Validates text is not empty
 * 3. Updates status to 'generating_audio'
 * 4. Clears all approvals (owner + collaborators)
 * 5. Synthesizes audio via TTS
 * 6. Uploads to storage
 * 7. Updates voiceover with audio URL and 'ready' status
 *
 * @example
 * const result = yield* generateVoiceoverAudio({ voiceoverId: 'voc_xxx' });
 */
export const generateVoiceoverAudio = (input: GenerateVoiceoverAudioInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;
    const tts = yield* TTS;
    const storage = yield* Storage;

    // 1. Load voiceover and validate state
    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    // Verify user is the owner
    if (voiceover.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotVoiceoverOwner({
          voiceoverId: input.voiceoverId,
          userId: input.userId,
        }),
      );
    }

    // Allow generation from drafting, ready, failed, or generating_audio status
    // (generating_audio is valid when called from worker after start-generation)
    const allowedStatuses = [
      VoiceoverStatus.DRAFTING,
      VoiceoverStatus.READY,
      VoiceoverStatus.FAILED,
      VoiceoverStatus.GENERATING_AUDIO,
    ];
    if (!allowedStatuses.includes(voiceover.status)) {
      return yield* Effect.fail(
        new InvalidVoiceoverAudioGeneration({
          voiceoverId: input.voiceoverId,
          reason: `Cannot generate audio from status '${voiceover.status}'. Voiceover must be in 'drafting', 'ready', 'failed', or 'generating_audio' status.`,
        }),
      );
    }

    // 2. Validate text is not empty
    const text = voiceover.text.trim();
    if (!text) {
      return yield* Effect.fail(
        new InvalidVoiceoverAudioGeneration({
          voiceoverId: input.voiceoverId,
          reason: 'Voiceover has no text to generate audio from.',
        }),
      );
    }

    // 3. Update status to generating
    yield* voiceoverRepo.updateStatus(input.voiceoverId, 'generating_audio');

    // 4. Clear all approvals (regeneration requires new approvals)
    yield* voiceoverRepo.clearApprovals(input.voiceoverId);
    yield* collaboratorRepo.clearAllApprovals(voiceover.id);

    // 5. Synthesize audio (single voice)
    const voice = voiceover.voice;
    const ttsResult = yield* tts.synthesize({
      turns: [{ speaker: 'narrator', text }],
      voiceConfigs: [{ speakerAlias: 'narrator', voiceId: voice }],
    });

    // 6. Upload to storage
    const audioKey = `voiceovers/${voiceover.id}/audio.wav`;
    yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/wav');
    const audioUrl = yield* storage.getUrl(audioKey);

    // 7. Estimate duration (WAV 24kHz 16-bit mono = 48KB/sec)
    const duration = Math.round(ttsResult.audioContent.length / 48000);

    // 8. Update voiceover with audio URL and ready status
    yield* voiceoverRepo.updateAudio(input.voiceoverId, { audioUrl, duration });
    const updatedVoiceover = yield* voiceoverRepo.updateStatus(
      input.voiceoverId,
      'ready',
    );

    return {
      voiceover: updatedVoiceover,
      audioUrl,
      duration,
    };
  }).pipe(
    Effect.catchTag('TTSError', (error) =>
      // On TTS failure, mark voiceover as failed
      Effect.gen(function* () {
        const voiceoverRepo = yield* VoiceoverRepo;
        yield* voiceoverRepo.updateStatus(
          input.voiceoverId,
          'failed',
          error.message,
        );
        return yield* Effect.fail(error);
      }),
    ),
    Effect.withSpan('useCase.generateVoiceoverAudio', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
