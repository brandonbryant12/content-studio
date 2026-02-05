import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, Prompt } from '@effect/cli';
import { Console, Effect } from 'effect';
import {
  TTS,
  FEMALE_VOICES,
  MALE_VOICES,
  DEFAULT_PREVIEW_TEXT,
  type GeminiVoiceId,
} from '@repo/ai';
import { createAILayer } from '../lib/ai-layer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../.output');

const genderPrompt = Prompt.select({
  message: 'Filter voices by gender',
  choices: [
    { title: 'Female', value: 'female' as const },
    { title: 'Male', value: 'male' as const },
  ],
});

const voicePrompt = Prompt.flatMap(genderPrompt, (gender) => {
  const voices = gender === 'female' ? FEMALE_VOICES : MALE_VOICES;
  return Prompt.select({
    message: 'Select a voice',
    choices: voices.map((id) => ({ title: id, value: id as GeminiVoiceId })),
  });
});

export const testTts = Command.prompt('tts', voicePrompt, (voiceId) =>
  Effect.gen(function* () {
    yield* Console.log(`\nGenerating preview for voice: ${voiceId}`);
    yield* Console.log(`Text: "${DEFAULT_PREVIEW_TEXT}"\n`);

    const aiLayer = yield* createAILayer();

    const result = yield* Effect.gen(function* () {
      const tts = yield* TTS;
      return yield* tts.previewVoice({
        voiceId,
        text: DEFAULT_PREVIEW_TEXT,
      });
    }).pipe(Effect.provide(aiLayer));

    const timestamp = Date.now();
    const filename = `tts-preview-${voiceId}-${timestamp}.wav`;
    const filePath = path.join(OUTPUT_DIR, filename);

    yield* Effect.tryPromise({
      try: () => fs.mkdir(OUTPUT_DIR, { recursive: true }),
      catch: (e) => new Error(`Failed to create output dir: ${e}`),
    });

    yield* Effect.tryPromise({
      try: () => fs.writeFile(filePath, result.audioContent),
      catch: (e) => new Error(`Failed to write audio file: ${e}`),
    });

    yield* Console.log('--- Result ---');
    yield* Console.log(`Voice:    ${result.voiceId}`);
    yield* Console.log(`Encoding: ${result.audioEncoding}`);
    yield* Console.log(
      `Size:     ${(result.audioContent.length / 1024).toFixed(1)} KB`,
    );
    yield* Console.log(`Saved to: ${filePath}`);
  }),
).pipe(Command.withDescription('Test TTS voice preview and audio generation'));
