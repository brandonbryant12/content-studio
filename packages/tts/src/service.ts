import { Context } from 'effect';
import type { VoiceInfo, GeminiVoiceId, VoiceGender } from './voices';
import type { TTSError, TTSQuotaExceededError } from '@repo/effect/errors';
import type { Effect } from 'effect';

/**
 * Audio encoding options.
 */
export type AudioEncoding = 'MP3' | 'LINEAR16' | 'OGG_OPUS';

/**
 * Options for listing voices.
 */
export interface ListVoicesOptions {
  readonly gender?: VoiceGender;
}

/**
 * Options for voice preview.
 */
export interface PreviewVoiceOptions {
  readonly voiceId: GeminiVoiceId;
  readonly text?: string; // Uses default sample text if not provided
  readonly audioEncoding?: AudioEncoding;
}

/**
 * Result from voice preview.
 */
export interface PreviewVoiceResult {
  readonly audioContent: Buffer;
  readonly audioEncoding: AudioEncoding;
  readonly voiceId: GeminiVoiceId;
}

/**
 * A single turn in a multi-speaker conversation.
 */
export interface SpeakerTurn {
  readonly speaker: string; // e.g., 'host', 'guest'
  readonly text: string;
}

/**
 * Voice mapping for multi-speaker synthesis.
 */
export interface SpeakerVoiceConfig {
  readonly speakerAlias: string; // e.g., 'host'
  readonly voiceId: string; // e.g., 'Charon', 'Kore'
}

/**
 * Options for speech synthesis.
 */
export interface SynthesizeOptions {
  readonly turns: readonly SpeakerTurn[];
  readonly voiceConfigs: readonly SpeakerVoiceConfig[];
  readonly audioEncoding?: AudioEncoding; // Default: 'MP3'
  readonly languageCode?: string; // Default: 'en-US'
}

/**
 * Result from speech synthesis.
 */
export interface SynthesizeResult {
  readonly audioContent: Buffer; // Raw audio bytes
  readonly audioEncoding: AudioEncoding;
}

/**
 * TTS service interface.
 * Synthesizes multi-speaker audio from conversation turns.
 */
export interface TTSService {
  /**
   * List available voices, optionally filtered by gender.
   */
  readonly listVoices: (options?: ListVoicesOptions) => Effect.Effect<readonly VoiceInfo[]>;

  /**
   * Generate a short preview of a voice.
   */
  readonly previewVoice: (
    options: PreviewVoiceOptions,
  ) => Effect.Effect<PreviewVoiceResult, TTSError | TTSQuotaExceededError>;

  /**
   * Synthesize speech from multiple speakers.
   * Returns complete audio with all turns combined.
   */
  readonly synthesize: (
    options: SynthesizeOptions,
  ) => Effect.Effect<SynthesizeResult, TTSError | TTSQuotaExceededError>;
}

/**
 * TTS service Context.Tag for dependency injection.
 */
export class TTS extends Context.Tag('@repo/tts/TTS')<TTS, TTSService>() {}
