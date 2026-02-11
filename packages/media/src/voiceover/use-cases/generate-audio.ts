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

const ALLOWED_GENERATION_STATUSES = [
  VoiceoverStatus.DRAFTING,
  VoiceoverStatus.READY,
  VoiceoverStatus.FAILED,
  VoiceoverStatus.GENERATING_AUDIO,
];

/**
 * Add TTS annotations via LLM and optionally generate a title.
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

export const generateVoiceoverAudio = (input: GenerateVoiceoverAudioInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const tts = yield* TTS;
    const storage = yield* Storage;

    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    if (voiceover.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotVoiceoverOwner({
          voiceoverId: input.voiceoverId,
          userId: input.userId,
        }),
      );
    }

    if (!ALLOWED_GENERATION_STATUSES.includes(voiceover.status)) {
      return yield* Effect.fail(
        new InvalidVoiceoverAudioGeneration({
          voiceoverId: input.voiceoverId,
          reason: `Cannot generate audio from status '${voiceover.status}'. Voiceover must be in 'drafting', 'ready', 'failed', or 'generating_audio' status.`,
        }),
      );
    }

    const text = voiceover.text.trim();
    if (!text) {
      return yield* Effect.fail(
        new InvalidVoiceoverAudioGeneration({
          voiceoverId: input.voiceoverId,
          reason: 'Voiceover has no text to generate audio from.',
        }),
      );
    }

    yield* voiceoverRepo.updateStatus(input.voiceoverId, 'generating_audio');
    yield* voiceoverRepo.clearApproval(input.voiceoverId);

    const { annotatedText, title: generatedTitle } = yield* preprocessText(
      text,
      voiceover.title,
    );

    const ttsResult = yield* tts.synthesize({
      turns: [{ speaker: 'narrator', text: annotatedText }],
      voiceConfigs: [{ speakerAlias: 'narrator', voiceId: voiceover.voice }],
    });

    const audioKey = `voiceovers/${voiceover.id}/audio-${Date.now()}.wav`;
    yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/wav');
    const audioUrl = yield* storage.getUrl(audioKey);

    // WAV 24kHz 16-bit mono = 48KB/sec
    const duration = Math.round(ttsResult.audioContent.length / 48000);

    yield* voiceoverRepo.updateAudio(input.voiceoverId, { audioUrl, duration });

    if (
      voiceover.title === DEFAULT_TITLE &&
      generatedTitle !== voiceover.title
    ) {
      yield* voiceoverRepo.update(input.voiceoverId, {
        title: generatedTitle,
      });
    }

    const updatedVoiceover = yield* voiceoverRepo.updateStatus(
      input.voiceoverId,
      'ready',
    );

    return { voiceover: updatedVoiceover, audioUrl, duration };
  }).pipe(
    Effect.catchTag('TTSError', (error) =>
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
