#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runScript } from '../lib/effect-script';

export const DEFAULT_MAX_JS_CHUNK_COUNT = 80;
export const DEFAULT_MAX_LARGEST_JS_CHUNK_KB = 450;

export type JsChunkInfo = {
  name: string;
  sizeBytes: number;
};

export type BuildGuardrailArgs = {
  distDir: string;
  maxChunkCount: number;
  maxLargestChunkKb: number;
};

const KB = 1024;

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseArgs = (argv: string[]): BuildGuardrailArgs => {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, 'true');
      continue;
    }

    args.set(key, next);
    index += 1;
  }

  return {
    distDir: args.get('dist') ?? path.join('apps', 'web', 'dist'),
    maxChunkCount: parsePositiveInt(args.get('max-chunk-count'), DEFAULT_MAX_JS_CHUNK_COUNT),
    maxLargestChunkKb: parsePositiveInt(
      args.get('max-largest-chunk-kb'),
      DEFAULT_MAX_LARGEST_JS_CHUNK_KB,
    ),
  };
};

const toKb = (sizeBytes: number): number => Number((sizeBytes / KB).toFixed(2));

const collectJsChunks = async (distDir: string): Promise<JsChunkInfo[]> => {
  const assetsDir = path.join(distDir, 'assets');
  const entries = await fs.readdir(assetsDir, { withFileTypes: true });

  const jsChunks: JsChunkInfo[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

    const filePath = path.join(assetsDir, entry.name);
    const stat = await fs.stat(filePath);
    jsChunks.push({
      name: entry.name,
      sizeBytes: stat.size,
    });
  }

  return jsChunks.sort((left, right) => right.sizeBytes - left.sizeBytes);
};

export const evaluateChunkGuardrails = (
  chunks: JsChunkInfo[],
  limits: Pick<BuildGuardrailArgs, 'maxChunkCount' | 'maxLargestChunkKb'>,
): string[] => {
  const errors: string[] = [];
  const largestChunk = chunks[0];

  if (chunks.length > limits.maxChunkCount) {
    errors.push(
      `JS chunk count ${chunks.length} exceeds max ${limits.maxChunkCount}. Reduce manual chunking or route-split sprawl.`,
    );
  }

  if (largestChunk) {
    const largestChunkKb = toKb(largestChunk.sizeBytes);
    if (largestChunkKb > limits.maxLargestChunkKb) {
      errors.push(
        `Largest JS chunk ${largestChunk.name} is ${largestChunkKb} kB, above max ${limits.maxLargestChunkKb} kB.`,
      );
    }
  }

  if (!largestChunk) {
    errors.push('No JS chunks found in dist/assets. Confirm web build output is present.');
  }

  return errors;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chunks = await collectJsChunks(args.distDir);
  const largestChunk = chunks[0];
  const largestChunkKb = largestChunk ? toKb(largestChunk.sizeBytes) : 0;

  console.log('Web build artifact report:');
  console.log(`- dist: ${args.distDir}`);
  console.log(`- jsChunkCount: ${chunks.length}`);
  console.log(
    `- largestJsChunk: ${largestChunk ? `${largestChunk.name} (${largestChunkKb} kB)` : 'none'}`,
  );
  console.log(
    `- thresholds: maxChunkCount=${args.maxChunkCount}, maxLargestChunkKb=${args.maxLargestChunkKb}`,
  );

  const violations = evaluateChunkGuardrails(chunks, args);
  if (violations.length === 0) {
    console.log('Web build artifact guardrails passed.');
    return;
  }

  console.error(`Web build artifact guardrails failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
}

runScript(main);
