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
  type AIProvider,
} from '@repo/ai';
import { createAILayer } from '../lib/ai-layer';
import { loadEnv } from '../lib/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../.output');

const PROVIDERS = [
  { title: 'Gemini (Google AI)', value: 'gemini' as const },
  { title: 'Vertex AI (Express)', value: 'vertex' as const },
];

const providerPrompt = Prompt.select({
  message: 'Select a provider',
  choices: PROVIDERS.map((p) => ({
    title: p.title,
    value: p.value,
    description: p.value,
  })),
});

const getDefaultKey = (
  provider: AIProvider,
): Effect.Effect<string | undefined> =>
  Effect.gen(function* () {
    const env = yield* loadEnv();
    return provider === 'vertex'
      ? env.GOOGLE_VERTEX_API_KEY
      : env.GEMINI_API_KEY;
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

const genderPrompt = Prompt.select({
  message: 'Filter voices by gender',
  choices: [
    { title: 'Female', value: 'female' as const },
    { title: 'Male', value: 'male' as const },
  ],
});

export const testTts = Command.make('tts', {}).pipe(
  Command.withHandler(() =>
    Effect.gen(function* () {
      const provider = yield* Prompt.run(providerPrompt);

      const defaultKey = yield* getDefaultKey(provider);
      const apiKey = yield* Prompt.run(
        Prompt.text({
          message: 'API key',
          default: defaultKey,
        }),
      );

      const gender = yield* Prompt.run(genderPrompt);
      const voices = gender === 'female' ? FEMALE_VOICES : MALE_VOICES;

      const voiceId = yield* Prompt.run(
        Prompt.select({
          message: 'Select a voice',
          choices: voices.map((id) => ({
            title: id,
            value: id as GeminiVoiceId,
          })),
        }),
      );

      yield* Console.log(`\nGenerating preview for voice: ${voiceId}`);
      yield* Console.log(`Provider: ${provider}`);
      yield* Console.log(`Text: "${DEFAULT_PREVIEW_TEXT}"\n`);

      const aiLayer = createAILayer({ provider, apiKey });

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
  ),
  Command.withDescription('Test TTS voice preview and audio generation'),
);
