import { Effect } from 'effect';
import { VoiceoverStatus, type Voiceover } from '@repo/db/schema';
import { TTS } from '@repo/ai/tts';
import { LLM } from '@repo/ai/llm';
import { Storage } from '@repo/storage';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import {
  InvalidVoiceoverAudioGeneration,
  NotVoiceoverOwner,
} from '../../errors';
import {
  PreprocessResultSchema,
  buildVoiceoverSystemPrompt,
  buildVoiceoverUserPrompt,
} from '../prompts';

const DEFAULT_TITLE = 'Untitled Voiceover';

/**
 * Preprocess voiceover text with LLM to add TTS annotations.
 * Optionally generates a title when the voiceover is still untitled.
 * Falls back to raw text + current title on any error.
 */
const preprocessText = (text: string, currentTitle: string) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const needsTitle = currentTitle === DEFAULT_TITLE;
    const { object } = yield* llm.generate({
      system: buildVoiceoverSystemPrompt(),
      prompt: buildVoiceoverUserPrompt({ text, needsTitle }),
      schema: PreprocessResultSchema,
      maxTokens: Math.max(1024, Math.ceil(text.length * 1.5)),
      temperature: 0.3,
    });
    return {
      annotatedText: object.annotatedText,
      title: object.title ?? currentTitle,
    };
  }).pipe(
    Effect.catchAll(() =>
      Effect.succeed({ annotatedText: text, title: currentTitle }),
    ),
    Effect.withSpan('useCase.preprocessVoiceoverText'),
  );

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
 * 4. Clears all approvals
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

    // 4. Clear approval (regeneration requires new approval)
    yield* voiceoverRepo.clearApproval(input.voiceoverId);

    // 5. Preprocess text with LLM (add TTS annotations + optional title)
    const voice = voiceover.voice;
    const { annotatedText, title: generatedTitle } = yield* preprocessText(
      text,
      voiceover.title,
    );

    // 6. Synthesize audio with annotated text
    const ttsResult = yield* tts.synthesize({
      turns: [{ speaker: 'narrator', text: annotatedText }],
      voiceConfigs: [{ speakerAlias: 'narrator', voiceId: voice }],
    });

    // 7. Upload to storage (timestamp in key for cache-busting)
    const audioKey = `voiceovers/${voiceover.id}/audio-${Date.now()}.wav`;
    yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/wav');
    const audioUrl = yield* storage.getUrl(audioKey);

    // 8. Estimate duration (WAV 24kHz 16-bit mono = 48KB/sec)
    const duration = Math.round(ttsResult.audioContent.length / 48000);

    // 9. Update voiceover with audio URL and ready status
    yield* voiceoverRepo.updateAudio(input.voiceoverId, { audioUrl, duration });

    // 10. Update title if it was auto-generated
    const shouldGenerateTitle = voiceover.title === DEFAULT_TITLE;
    if (shouldGenerateTitle && generatedTitle !== voiceover.title) {
      yield* voiceoverRepo.update(input.voiceoverId, {
        title: generatedTitle,
      });
    }

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
