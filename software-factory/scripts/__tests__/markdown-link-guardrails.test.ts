import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findMissingMarkdownLinkTargets } from '../guardrails/script-guardrails';

describe('markdown link guardrails', () => {
  it('handles anchors/query suffixes and skips external links', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'markdown-link-guardrails-'));

    try {
      await mkdir(path.join(rootDir, 'docs', 'targets'), { recursive: true });
      await writeFile(path.join(rootDir, 'docs', 'targets', 'existing.md'), '# Existing\n');
      await writeFile(
        path.join(rootDir, 'docs', 'guide.md'),
        [
          '[Anchor](./targets/existing.md#section)',
          '[Query](./targets/existing.md?plain=1)',
          '[External](https://example.com/docs)',
          '[Mail](mailto:test@example.com)',
          '[Local](#local-anchor)',
          '[Missing](./targets/missing.md#missing)',
        ].join('\n'),
      );

      const issues = await findMissingMarkdownLinkTargets(rootDir);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual(
        expect.objectContaining({
          code: 'missing-markdown-link-target',
          path: 'docs/guide.md',
        }),
      );
      expect(issues[0]?.message).toContain('./targets/missing.md#missing');
      expect(issues[0]?.message).toContain('docs/targets/missing.md');
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it('resolves root-absolute markdown paths within repository', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'markdown-link-guardrails-'));

    try {
      await mkdir(path.join(rootDir, 'docs', 'targets'), { recursive: true });
      await writeFile(path.join(rootDir, 'docs', 'targets', 'existing.md'), '# Existing\n');
      await writeFile(path.join(rootDir, 'docs', 'guide.md'), '[Absolute](/docs/targets/existing.md)');

      const issues = await findMissingMarkdownLinkTargets(rootDir);

      expect(issues).toEqual([]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
