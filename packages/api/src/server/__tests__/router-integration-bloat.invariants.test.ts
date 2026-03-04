import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..', '..', '..');

type RouterBloatTarget = {
  name: string;
  file: string;
  maxTests: number;
};

const targets: RouterBloatTarget[] = [
  {
    name: 'source',
    file: 'packages/api/src/server/router/__tests__/source.integration.test.ts',
    maxTests: 24,
  },
  {
    name: 'podcast',
    file: 'packages/api/src/server/router/__tests__/podcast.integration.test.ts',
    maxTests: 30,
  },
  {
    name: 'voiceover',
    file: 'packages/api/src/server/router/__tests__/voiceover.integration.test.ts',
    maxTests: 24,
  },
];

const countMatches = (source: string, pattern: RegExp) =>
  (source.match(pattern) ?? []).length;

describe('router integration bloat invariants', () => {
  it('keeps auth checks shared and prevents per-handler unauthorized duplication', () => {
    for (const target of targets) {
      const source = fs.readFileSync(path.join(repoRoot, target.file), 'utf-8');

      const sharedAuthCount = countMatches(
        source,
        /returns UNAUTHORIZED for all protected handlers when user is missing/g,
      );
      expect(
        sharedAuthCount,
        `${target.name}: expected exactly one shared unauthorized test.`,
      ).toBe(1);

      const legacyPerHandlerAuthCount = countMatches(
        source,
        /returns UNAUTHORIZED when user is null/g,
      );
      expect(
        legacyPerHandlerAuthCount,
        `${target.name}: do not add per-handler unauthorized tests.`,
      ).toBe(0);
    }
  });

  it('keeps high-risk router integration suites under test-count caps', () => {
    for (const target of targets) {
      const source = fs.readFileSync(path.join(repoRoot, target.file), 'utf-8');
      const itCount = countMatches(source, /\bit\(/g);

      expect(
        itCount,
        `${target.name}: integration suite exceeded bloat cap (${target.maxTests}).`,
      ).toBeLessThanOrEqual(target.maxTests);
    }
  });
});
