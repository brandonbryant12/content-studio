import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '@effect/cli';
import { VOICES, GoogleTTSLive, previewVoice } from '@repo/ai/tts';
import { Console, Effect } from 'effect';
import { loadEnv, type EnvError } from '../lib/env';

/** The 8 voices exposed in the frontend UI */
const FRONTEND_VOICE_IDS = [
  'Aoede',
  'Kore',
  'Leda',
  'Zephyr',
  'Charon',
  'Fenrir',
  'Puck',
  'Orus',
] as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Directory where downloaded voice .wav files are stored */
const VOICES_DIR = path.resolve(
  __dirname,
  '../../../../packages/ai/voice-previews',
);

const voiceFilePath = (voiceId: string) =>
  path.join(VOICES_DIR, `${voiceId}.wav`);

const run = Effect.gen(function* () {
  const env = yield* loadEnv();

  if (!env.GEMINI_API_KEY) {
    yield* Console.log('Error: GEMINI_API_KEY is required.');
    return;
  }

  yield* Console.log('\nDownloading voice previews...\n');

  const ttsLayer = GoogleTTSLive({ apiKey: env.GEMINI_API_KEY });

  const voiceNames = VOICES.filter((v) =>
    FRONTEND_VOICE_IDS.includes(v.id as (typeof FRONTEND_VOICE_IDS)[number]),
  ).reduce(
    (acc, v) => {
      acc[v.id] = v.name;
      return acc;
    },
    {} as Record<string, string>,
  );

  // Ensure output directory exists
  fs.mkdirSync(VOICES_DIR, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const voiceId of FRONTEND_VOICE_IDS) {
    const filePath = voiceFilePath(voiceId);
    const name = voiceNames[voiceId] ?? voiceId;

    // Skip if file already exists locally
    if (fs.existsSync(filePath)) {
      yield* Console.log(`  SKIP  ${name} — ${filePath} already exists`);
      skipped++;
      continue;
    }

    // Generate preview via TTS API
    const result = yield* previewVoice({ voiceId }).pipe(
      Effect.provide(ttsLayer),
      Effect.either,
    );

    if (result._tag === 'Left') {
      yield* Console.log(`  FAIL  ${name} — ${String(result.left)}`);
      failed++;
      continue;
    }

    // Write to local file
    fs.writeFileSync(filePath, Uint8Array.from(result.right.audioContent));
    const sizeKb = (result.right.audioContent.length / 1024).toFixed(1);
    yield* Console.log(`  OK    ${name} — ${sizeKb} KB → ${filePath}`);
    downloaded++;
  }

  yield* Console.log(
    `\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`,
  );
  yield* Console.log(`\nVoice files saved to: ${VOICES_DIR}`);
}).pipe(
  Effect.catchTag('EnvError', (e: EnvError) =>
    Console.log(`\nEnvironment error: ${e.message}`),
  ),
);

export const downloadVoices = Command.make(
  'download-voices',
  {},
  () => run,
).pipe(
  Command.withDescription(
    'Download TTS voice preview clips to packages/ai/voice-previews/',
  ),
);
