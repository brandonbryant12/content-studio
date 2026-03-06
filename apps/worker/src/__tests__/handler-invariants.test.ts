import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(currentDir, '..');
const handlersDir = path.join(workerRoot, 'handlers');
const jobHandlerPath = path.join(handlersDir, 'job-handler.ts');

const collectHandlerFiles = (): string[] =>
  fs
    .readdirSync(handlersDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(handlersDir, file));

const read = (filePath: string): string => fs.readFileSync(filePath, 'utf-8');

const relative = (filePath: string): string =>
  path.relative(workerRoot, filePath).replace(/\\/g, '/');

describe('worker handler invariants', () => {
  it('requires worker handler modules to use defineJobHandler', () => {
    const offenders = collectHandlerFiles()
      .filter((filePath) => filePath !== jobHandlerPath)
      .filter(
        (filePath) => !/defineJobHandler(?:<[^>]+>)?\(\)/m.test(read(filePath)),
      )
      .map(relative);

    expect(
      offenders,
      'Use defineJobHandler() for worker handlers so spans and JobProcessingError wrapping stay consistent.',
    ).toEqual([]);
  });

  it('forbids direct JobProcessingError construction in worker handler modules', () => {
    const offenders = collectHandlerFiles()
      .filter((filePath) => filePath !== jobHandlerPath)
      .filter((filePath) => read(filePath).includes('new JobProcessingError('))
      .map(relative);

    expect(
      offenders,
      'Route worker handler failures through defineJobHandler() instead of constructing JobProcessingError inline.',
    ).toEqual([]);
  });

  it('forbids direct worker span creation in worker handler modules', () => {
    const offenders = collectHandlerFiles()
      .filter((filePath) => filePath !== jobHandlerPath)
      .filter((filePath) => /Effect\.withSpan\('worker\./m.test(read(filePath)))
      .map(relative);

    expect(
      offenders,
      "Route worker handler spans through defineJobHandler() instead of calling Effect.withSpan('worker.*') inline.",
    ).toEqual([]);
  });

  it('requires the shared job handler helper to annotate core job attributes', () => {
    const source = read(jobHandlerPath);

    expect(source).toContain("'job.id'");
    expect(source).toContain("'job.type'");
    expect(source).toContain("'user.id'");
    expect(source).toContain('new JobProcessingError(');
    expect(source).toContain('Effect.withSpan(options.span');
  });
});
