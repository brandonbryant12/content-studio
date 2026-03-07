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

const shouldSkipUseCaseTest = (filePath: string): boolean => {
  const name = path.basename(filePath);
  if (name === 'index.ts') return true;
  if (name === 'types.ts') return true;
  if (name === 'errors.ts') return true;
  if (name.endsWith('utils.ts')) return true;
  return false;
};

const getExpectedTestPath = (filePath: string): string => {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.ts');
  return path.join(dir, '__tests__', `${base}.test.ts`);
};

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(srcRoot, relativePath), 'utf-8');

const usesExplicitUseCaseSpanPattern = (source: string): boolean =>
  source.includes('withUseCaseSpan(') &&
  source.includes('annotateUseCaseSpan(');

const usesUseCaseHelper = (source: string): boolean =>
  /define(?:Authed|Role)UseCase(?:<[^>]+>)?\(\)/m.test(source);

const usesAuthedUseCaseSpanMetadata = (source: string): boolean =>
  source.includes('span:') || source.includes('annotateSpan(');

describe('safety invariants', () => {
  it('forbids blanket catchAll null/void fallbacks in media use-cases', () => {
    const files = collectUseCaseFiles(srcRoot);
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(file, 'utf-8');
      const swallowsVoid = /Effect\.catchAll\(\(\)\s*=>\s*Effect\.void\)/m.test(
        source,
      );
      const swallowsNull =
        /Effect\.catchAll\(\(\)\s*=>\s*Effect\.succeed\(null\)\)/m.test(source);
      return swallowsVoid || swallowsNull;
    });

    expect(
      offenders.map((file) => path.relative(srcRoot, file)),
      'Use runBestEffortSideEffect(...) for intentional best-effort side effects; otherwise propagate failures.',
    ).toEqual([]);
  });

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

  it('requires use-case spans to annotate user and resource ids', () => {
    const files = collectUseCaseFiles(srcRoot).filter(
      (file) => !shouldSkipUseCaseTest(file),
    );
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(file, 'utf-8');
      if (!/useCase\./.test(source)) return false;
      return (
        !usesExplicitUseCaseSpanPattern(source) &&
        !(usesUseCaseHelper(source) && usesAuthedUseCaseSpanMetadata(source))
      );
    });

    expect(
      offenders.map((file) => path.relative(srcRoot, file)),
      'Use defineAuthedUseCase(), defineRoleUseCase(), or withUseCaseSpan + annotateUseCaseSpan to include user.id and resource metadata.',
    ).toEqual([]);
  });

  it('enforces required span attributes on the use-case helper', () => {
    const source = read('shared/safety-primitives.ts');

    expect(source).toContain("'user.id'");
    expect(source).toContain("'resource.id'");
    expect(source).toContain("'resource.kind'");
    expect(source).toContain("'resource.name'");
  });

  it('requires use-case helpers to preserve auth + span primitives', () => {
    const source = read('shared/use-case.ts');

    expect(source).toContain('getCurrentUser');
    expect(source).toContain('requireRole(');
    expect(source).toContain('defineRoleUseCase');
    expect(source).toContain('annotateUseCaseSpan(');
    expect(source).toContain('withUseCaseSpan(');
    expect(source).toContain('userId: user.id');
  });

  it('requires a unit test file for each media use-case', () => {
    const files = collectUseCaseFiles(srcRoot).filter(
      (file) => !shouldSkipUseCaseTest(file),
    );
    const missing = files.filter(
      (file) => !fs.existsSync(getExpectedTestPath(file)),
    );

    expect(
      missing.map((file) => path.relative(srcRoot, file)),
      'Add matching __tests__/{name}.test.ts files or document exceptions.',
    ).toEqual([]);
  });

  it('requires use-case spans to include user and resource attributes', () => {
    const files = collectUseCaseFiles(srcRoot).filter(
      (file) => !shouldSkipUseCaseTest(file),
    );
    const missing = files.filter((file) => {
      const source = fs.readFileSync(file, 'utf-8');
      return (
        !source.includes('annotateUseCaseSpan(') &&
        !(usesUseCaseHelper(source) && usesAuthedUseCaseSpanMetadata(source))
      );
    });

    expect(
      missing.map((file) => path.relative(srcRoot, file)),
      'Use defineAuthedUseCase(), defineRoleUseCase(), or annotateUseCaseSpan() to attach user.id and resource metadata to use-case spans.',
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

  it('requires update-source to use safe content replacement primitive', () => {
    const source = read('source/use-cases/update-source.ts');
    expect(source).toContain('replaceTextContentSafely(');
  });

  it('requires state+enqueue flows to use transactional primitive', () => {
    const files = [
      'podcast/use-cases/start-generation.ts',
      'voiceover/use-cases/start-generation.ts',
      'infographic/use-cases/generate-infographic.ts',
      'source/use-cases/create-from-url.ts',
      'source/use-cases/create-from-research.ts',
      'source/use-cases/retry-processing.ts',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toContain('withTransactionalStateAndEnqueue(');
    }
  });
});
