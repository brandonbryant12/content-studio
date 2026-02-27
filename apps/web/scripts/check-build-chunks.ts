import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST_ASSETS_DIR = path.resolve(process.cwd(), 'dist/assets');
const MAX_JS_CHUNKS = 80;
const MAX_LARGEST_JS_CHUNK_BYTES = 450 * 1024;

type ChunkFile = {
  file: string;
  bytes: number;
};

function formatKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function readJsChunks(dir: string): ChunkFile[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const bytes = statSync(path.join(dir, file)).size;
      return { file, bytes };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

function main() {
  const chunks = readJsChunks(DIST_ASSETS_DIR);
  const chunkCount = chunks.length;
  const largestChunk = chunks[0];
  const largestChunkBytes = largestChunk?.bytes ?? 0;

  console.log('[web:chunk-guard] Build chunk report');
  console.log(`- JS chunks: ${chunkCount} (threshold: <= ${MAX_JS_CHUNKS})`);
  console.log(
    `- Largest JS chunk: ${
      largestChunk
        ? `${largestChunk.file} (${formatKiB(largestChunkBytes)})`
        : 'n/a'
    } (threshold: <= ${formatKiB(MAX_LARGEST_JS_CHUNK_BYTES)})`,
  );

  const failures: string[] = [];
  if (chunkCount > MAX_JS_CHUNKS) {
    failures.push(
      `JS chunk count ${chunkCount} exceeds threshold ${MAX_JS_CHUNKS}. Prefer route-level splitting and avoid extra manual chunk branches.`,
    );
  }

  if (largestChunkBytes > MAX_LARGEST_JS_CHUNK_BYTES) {
    failures.push(
      `Largest JS chunk ${formatKiB(largestChunkBytes)} exceeds threshold ${formatKiB(MAX_LARGEST_JS_CHUNK_BYTES)}.`,
    );
  }

  if (failures.length > 0) {
    console.error('[web:chunk-guard] FAILED');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('[web:chunk-guard] PASS');
}

main();
