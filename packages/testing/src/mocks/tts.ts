import {
  TTS,
  type TTSService,
  type VoiceInfo,
  type SynthesizeResult,
  type PreviewVoiceResult,
  TTSError,
  type TTSQuotaExceededError,
} from '@repo/ai';
import { Layer, Effect } from 'effect';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Mock voice list for testing.
 */
export const MOCK_VOICES: readonly VoiceInfo[] = [
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    description: 'Deep male voice',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    description: 'Warm female voice',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    description: 'Energetic male voice',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    description: 'Clear female voice',
  },
];

/**
 * Path to the sample podcast audio fixture.
 * This is a real audio file used for realistic mock responses.
 */
const SAMPLE_AUDIO_PATH = path.join(__dirname, '../../fixtures/sample-podcast.wav');

/**
 * Cached sample audio buffer to avoid repeated file reads.
 */
let cachedSampleAudio: Buffer | null = null;

/**
 * Load the sample audio file from fixtures.
 * Returns the real audio file if available, falls back to generated silence.
 */
const loadSampleAudio = (): Buffer => {
  if (cachedSampleAudio) {
    return cachedSampleAudio;
  }

  try {
    cachedSampleAudio = fs.readFileSync(SAMPLE_AUDIO_PATH);
    return cachedSampleAudio;
  } catch {
    // Fall back to generated silence if file not found
    return createSilentAudioBuffer(30);
  }
};

/**
 * Create a minimal WAV file header for testing.
 * Returns a valid but silent WAV buffer.
 */
const createSilentAudioBuffer = (durationSeconds: number = 5): Buffer => {
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const channels = 1;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * channels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // byte rate
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Audio data is zeroes (silence) - buffer is already zeroed

  return buffer;
};

/**
 * Options for creating a mock TTS service.
 */
export interface MockTTSOptions {
  /**
   * Simulated delay in milliseconds before returning.
   */
  delay?: number;

  /**
   * Custom voices to return.
   */
  voices?: readonly VoiceInfo[];

  /**
   * Duration of the mock audio in seconds (only used if useSampleAudio is false).
   */
  audioDurationSeconds?: number;

  /**
   * If true, use the sample-podcast.wav fixture instead of generated silence.
   * Defaults to true.
   */
  useSampleAudio?: boolean;

  /**
   * If set, the synthesize method will fail with this error message.
   */
  errorMessage?: string;
}

/**
 * Create a mock TTS layer for testing.
 *
 * @example
 * ```ts
 * const MockTTS = createMockTTS({ delay: 100 });
 *
 * await Effect.runPromise(
 *   generator.generateAudio(podcastId).pipe(
 *     Effect.provide(MockTTS)
 *   )
 * );
 * ```
 */
export const createMockTTS = (
  options: MockTTSOptions = {},
): Layer.Layer<TTS> => {
  const useSampleAudio = options.useSampleAudio ?? true;
  const audioBuffer = useSampleAudio
    ? loadSampleAudio()
    : createSilentAudioBuffer(options.audioDurationSeconds ?? 30);

  const service: TTSService = {
    listVoices: () =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        return options.voices ?? MOCK_VOICES;
      }),

    previewVoice: ({
      voiceId,
    }): Effect.Effect<PreviewVoiceResult, TTSError | TTSQuotaExceededError> =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }

        if (options.errorMessage) {
          return yield* Effect.fail(
            new TTSError({ message: options.errorMessage }),
          );
        }

        return {
          audioContent: createSilentAudioBuffer(2),
          audioEncoding: 'LINEAR16',
          voiceId,
        } as PreviewVoiceResult;
      }),

    synthesize: (): Effect.Effect<
      SynthesizeResult,
      TTSError | TTSQuotaExceededError
    > =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }

        if (options.errorMessage) {
          return yield* Effect.fail(
            new TTSError({ message: options.errorMessage }),
          );
        }

        return {
          audioContent: audioBuffer,
          audioEncoding: 'LINEAR16',
          mimeType: 'audio/wav',
        } as SynthesizeResult;
      }),
  };

  return Layer.succeed(TTS, service);
};

/**
 * Default mock TTS layer with standard test responses.
 */
export const MockTTSLive = createMockTTS();
