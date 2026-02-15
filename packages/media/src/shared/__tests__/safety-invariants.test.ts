import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(currentDir, '..', '..');

const collectUseCaseFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectUseCaseFiles(fullPath));
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (entry.name.endsWith('.test.ts')) continue;
    if (!fullPath.includes(`${path.sep}use-cases${path.sep}`)) continue;
    files.push(fullPath);
  }

  return files;
};

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(srcRoot, relativePath), 'utf-8');

describe('safety invariants', () => {
  it('forbids direct queue.getJob usage in media use-cases', () => {
    const files = collectUseCaseFiles(srcRoot);
    const offenders = files.filter((file) =>
      /queue\s*\.\s*getJob\s*\(/m.test(fs.readFileSync(file, 'utf-8')),
    );

    expect(
      offenders.map((file) => path.relative(srcRoot, file)),
      'Use getOwnedJobOrNotFound() from shared safety primitives.',
    ).toEqual([]);
  });

  it('forbids direct queue.enqueue usage in media use-cases', () => {
    const files = collectUseCaseFiles(srcRoot);
    const offenders = files.filter((file) =>
      /queue\s*\.\s*enqueue\s*\(/m.test(fs.readFileSync(file, 'utf-8')),
    );

    expect(
      offenders.map((file) => path.relative(srcRoot, file)),
      'Use enqueueJob() from shared safety primitives.',
    ).toEqual([]);
  });

  it('requires get-job use-cases to use ownership primitive', () => {
    const files = [
      'podcast/use-cases/get-job.ts',
      'voiceover/use-cases/get-job.ts',
      'infographic/use-cases/get-job.ts',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toContain('getOwnedJobOrNotFound(');
    }
  });

  it('requires update-document to use safe content replacement primitive', () => {
    const source = read('document/use-cases/update-document.ts');
    expect(source).toContain('replaceTextContentSafely(');
  });

  it('requires state+enqueue flows to use transactional primitive', () => {
    const files = [
      'podcast/use-cases/start-generation.ts',
      'voiceover/use-cases/start-generation.ts',
      'infographic/use-cases/generate-infographic.ts',
      'document/use-cases/create-from-url.ts',
      'document/use-cases/create-from-research.ts',
      'document/use-cases/retry-processing.ts',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toContain('withTransactionalStateAndEnqueue(');
    }
  });
});
