import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Layer, Effect } from 'effect';
import type { VoiceInfo } from '../tts/voices';
import { TTSError, VoiceNotFoundError } from '../errors';
import {
  TTS,
  type PreviewVoiceResult,
  type SynthesizeResult,
  type TTSService,
} from '../tts/service';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_AUDIO_PATH = path.join(
  __dirname,
  '../../fixtures/sample-podcast.wav',
);

let cachedSampleAudio: Buffer | null = null;

function loadSampleAudio(): Buffer {
  if (cachedSampleAudio) {
    return cachedSampleAudio;
  }

  try {
    cachedSampleAudio = fs.readFileSync(SAMPLE_AUDIO_PATH);
    return cachedSampleAudio;
  } catch {
    // Fall back to generated silence if fixture file not found
    return createSilentAudioBuffer(30);
  }
}

/** Create a minimal valid WAV file buffer of silence. */
function createSilentAudioBuffer(durationSeconds: number = 5): Buffer {
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
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk (buffer is already zeroed = silence)
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export interface MockTTSOptions {
  delay?: number;
  voices?: readonly VoiceInfo[];
  audioDurationSeconds?: number;
  /** Use the sample-podcast.wav fixture instead of generated silence. Defaults to true. */
  useSampleAudio?: boolean;
  errorMessage?: string;
  listVoices?: TTSService['listVoices'];
  previewVoice?: TTSService['previewVoice'];
  synthesize?: TTSService['synthesize'];
}

export function createMockTTSService(options: MockTTSOptions = {}): TTSService {
  const useSampleAudio = options.useSampleAudio ?? true;
  const audioBuffer = useSampleAudio
    ? loadSampleAudio()
    : createSilentAudioBuffer(options.audioDurationSeconds ?? 30);
  const availableVoices = options.voices ?? MOCK_VOICES;

  const defaultListVoices: TTSService['listVoices'] = (listOptions) =>
    Effect.gen(function* () {
      if (options.delay) {
        yield* Effect.sleep(options.delay);
      }
      return listOptions?.gender
        ? availableVoices.filter((voice) => voice.gender === listOptions.gender)
        : availableVoices;
    });

  const defaultPreviewVoice: TTSService['previewVoice'] = ({ voiceId }) =>
    Effect.gen(function* () {
      if (options.delay) {
        yield* Effect.sleep(options.delay);
      }

      const voiceExists = availableVoices.some((voice) => voice.id === voiceId);
      if (!voiceExists) {
        return yield* Effect.fail(new VoiceNotFoundError({ voiceId }));
      }

      if (options.errorMessage) {
        return yield* Effect.fail(
          new TTSError({ message: options.errorMessage }),
        );
      }

      return {
        audioContent: createSilentAudioBuffer(2),
        audioEncoding: 'LINEAR16' as const,
        voiceId,
      } satisfies PreviewVoiceResult;
    });

  const defaultSynthesize: TTSService['synthesize'] = () =>
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
        audioEncoding: 'LINEAR16' as const,
        mimeType: 'audio/wav',
      } satisfies SynthesizeResult;
    });

  return {
    listVoices: options.listVoices ?? defaultListVoices,
    previewVoice: options.previewVoice ?? defaultPreviewVoice,
    synthesize: options.synthesize ?? defaultSynthesize,
  };
}

export function createMockTTS(options: MockTTSOptions = {}): Layer.Layer<TTS> {
  const service = createMockTTSService(options);
  return Layer.succeed(TTS, service);
}

export const MockTTSLive = createMockTTS();

export const MockTTSWithLatency = createMockTTS({ delay: 15_000 });
