import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, Prompt } from '@effect/cli';
import { Console, Effect } from 'effect';
import {
  TTS,
  FEMALE_VOICES,
  MALE_VOICES,
  type GeminiVoiceId,
} from '@repo/ai';
import { createAILayer } from '../lib/ai-layer';
import { loadEnv } from '../lib/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../.output');

const SAMPLE_DIALOGUE = [
  { speaker: 'Host', text: 'Welcome to the show! Today we have a very special guest.' },
  { speaker: 'Guest', text: 'Thanks for having me, it is great to be here!' },
  { speaker: 'Host', text: 'So tell us, what have you been working on lately?' },
  { speaker: 'Guest', text: 'I have been exploring the latest advances in AI-generated speech. It is truly remarkable how natural it sounds now.' },
] as const;

const genderPrompt = (label: string) =>
  Prompt.select({
    message: `${label} voice gender`,
    choices: [
      { title: 'Female', value: 'female' as const },
      { title: 'Male', value: 'male' as const },
    ],
  });

const voicePrompt = (label: string, voices: readonly string[]) =>
  Prompt.select({
    message: `${label} voice`,
    choices: voices.map((id) => ({
      title: id,
      value: id as GeminiVoiceId,
    })),
  });

const getDefaultKey = (): Effect.Effect<string | undefined> =>
  Effect.gen(function* () {
    const env = yield* loadEnv();
    return env.GEMINI_API_KEY;
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

export const testTts = Command.make('tts', {}).pipe(
  Command.withHandler(() =>
    Effect.gen(function* () {
      const defaultKey = yield* getDefaultKey();
      const apiKey = yield* Prompt.run(
        Prompt.text({
          message: 'API key',
          default: defaultKey,
        }),
      );

      // Pick host voice
      const hostGender = yield* Prompt.run(genderPrompt('Host'));
      const hostVoices = hostGender === 'female' ? FEMALE_VOICES : MALE_VOICES;
      const hostVoice = yield* Prompt.run(voicePrompt('Host', hostVoices));

      // Pick guest voice
      const guestGender = yield* Prompt.run(genderPrompt('Guest'));
      const guestVoices =
        guestGender === 'female' ? FEMALE_VOICES : MALE_VOICES;
      const guestVoice = yield* Prompt.run(voicePrompt('Guest', guestVoices));

      yield* Console.log(`\nMulti-speaker synthesis`);
      yield* Console.log(`Host:  ${hostVoice}`);
      yield* Console.log(`Guest: ${guestVoice}`);
      yield* Console.log(`Turns: ${SAMPLE_DIALOGUE.length}\n`);

      const aiLayer = createAILayer({ provider: 'gemini', apiKey });

      const result = yield* Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: SAMPLE_DIALOGUE.map((t) => ({
            speaker: t.speaker,
            text: t.text,
          })),
          voiceConfigs: [
            { speakerAlias: 'Host', voiceId: hostVoice },
            { speakerAlias: 'Guest', voiceId: guestVoice },
          ],
        });
      }).pipe(Effect.provide(aiLayer));

      const timestamp = Date.now();
      const filename = `tts-multi-${hostVoice}-${guestVoice}-${timestamp}.wav`;
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
      yield* Console.log(`Encoding: ${result.audioEncoding}`);
      yield* Console.log(
        `Size:     ${(result.audioContent.length / 1024).toFixed(1)} KB`,
      );
      yield* Console.log(`Saved to: ${filePath}`);
    }),
  ),
  Command.withDescription('Test TTS multi-speaker synthesis'),
);
