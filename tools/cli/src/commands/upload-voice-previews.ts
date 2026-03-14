import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '@effect/cli';
import { Storage, S3StorageLive } from '@repo/storage';
import { Console, Effect } from 'effect';
import type { Layer } from 'effect';
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

const storageKey = (voiceId: string) => `voice-previews/${voiceId}.wav`;

const buildStorageLayer = (env: {
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  S3_PUBLIC_ENDPOINT?: string;
}): Layer.Layer<Storage> => {
  if (
    !env.S3_BUCKET ||
    !env.S3_REGION ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      'S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required.',
    );
  }

  return S3StorageLive({
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT,
    publicEndpoint: env.S3_PUBLIC_ENDPOINT,
  });
};

const run = Effect.gen(function* () {
  const env = yield* loadEnv();

  yield* Console.log('\nUploading voice previews to storage...\n');

  const storageLayer = buildStorageLayer(env);

  // Check that voice-previews directory exists
  if (!fs.existsSync(VOICES_DIR)) {
    yield* Console.log(
      `Error: Voice previews directory not found: ${VOICES_DIR}`,
    );
    yield* Console.log(
      'Run "seed download-voices" first to download the voice files.',
    );
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let missing = 0;

  for (const voiceId of FRONTEND_VOICE_IDS) {
    const filePath = voiceFilePath(voiceId);
    const key = storageKey(voiceId);

    // Check local file exists
    if (!fs.existsSync(filePath)) {
      yield* Console.log(`  MISS  ${voiceId} — ${filePath} not found`);
      missing++;
      continue;
    }

    // Check if already uploaded
    const exists = yield* Effect.gen(function* () {
      const storage = yield* Storage;
      return yield* storage.exists(key);
    }).pipe(
      Effect.provide(storageLayer),
      Effect.catchAll(() => Effect.succeed(false)),
    );

    if (exists) {
      yield* Console.log(`  SKIP  ${voiceId} — already exists in storage`);
      skipped++;
      continue;
    }

    // Read local file and upload
    const audioContent = fs.readFileSync(filePath);

    const uploadResult = yield* Effect.gen(function* () {
      const storage = yield* Storage;
      return yield* storage.upload(key, audioContent, 'audio/wav');
    }).pipe(Effect.provide(storageLayer), Effect.either);

    if (uploadResult._tag === 'Left') {
      yield* Console.log(
        `  FAIL  ${voiceId} — upload: ${String(uploadResult.left)}`,
      );
      failed++;
      continue;
    }

    const sizeKb = (audioContent.length / 1024).toFixed(1);
    yield* Console.log(`  OK    ${voiceId} — ${sizeKb} KB → ${key}`);
    uploaded++;
  }

  yield* Console.log(
    `\nDone. uploaded=${uploaded} skipped=${skipped} failed=${failed} missing=${missing}`,
  );
}).pipe(
  Effect.catchTag('EnvError', (e: EnvError) =>
    Console.log(`\nEnvironment error: ${e.message}`),
  ),
);

export const uploadVoicePreviews = Command.make(
  'upload-voice-previews',
  {},
  () => run,
).pipe(
  Command.withDescription(
    'Upload local voice preview .wav files to S3 storage',
  ),
);
