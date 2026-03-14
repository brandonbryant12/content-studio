import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(currentDir, '..');
const providerRoot = path.join(srcRoot, 'providers', 'google');

const collectFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
};

const read = (filePath: string) => fs.readFileSync(filePath, 'utf-8');

const collectRelativeImports = (source: string): string[] => {
  const imports: string[] = [];
  const matcher = /\b(?:import|export)\b[\s\S]*?\bfrom\s+['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null = null;
  while ((match = matcher.exec(source)) !== null) {
    const specifier = match[1];
    if (specifier?.startsWith('.')) {
      imports.push(specifier);
    }
  }

  return imports;
};

const resolvesToBarrel = (importerPath: string, specifier: string): boolean => {
  const resolved = path.resolve(path.dirname(importerPath), specifier);

  if (fs.existsSync(path.join(resolved, 'index.ts'))) {
    return true;
  }

  return path.basename(resolved) === 'index' && fs.existsSync(`${resolved}.ts`);
};

describe('AI package invariants', () => {
  it('forbids internal barrel imports outside barrel files', () => {
    const offenders = collectFiles(srcRoot)
      .filter((filePath) => path.basename(filePath) !== 'index.ts')
      .flatMap((filePath) =>
        collectRelativeImports(read(filePath))
          .filter((specifier) => resolvesToBarrel(filePath, specifier))
          .map(
            (specifier) =>
              `${path.relative(srcRoot, filePath)} -> ${specifier}`,
          ),
      );

    expect(
      offenders,
      'Import concrete modules inside packages/ai/src; reserve barrels for public entrypoints only.',
    ).toEqual([]);
  });

  it('forbids service double-casts in AI tests', () => {
    const offenders = collectFiles(srcRoot)
      .filter((filePath) => filePath.endsWith('.test.ts'))
      .filter((filePath) => !filePath.endsWith('ai-package.invariants.test.ts'))
      .flatMap((filePath) => {
        const source = read(filePath);
        const matcher =
          /as\s+unknown\s+as\s+[A-Za-z0-9_$.[\]'"<>| ]*Service\b/g;
        const matches = source.match(matcher) ?? [];
        return matches.map(() =>
          path.relative(srcRoot, filePath).split(path.sep).join('/'),
        );
      });

    expect(
      offenders,
      'Use shared typed AI test helpers instead of `as unknown as ...Service` in tests.',
    ).toEqual([]);
  });

  it('requires explicit timeout budgets in Google provider modules', () => {
    const providerFiles = [
      'llm.ts',
      'tts.ts',
      'image-gen.ts',
      'research.ts',
    ].map((fileName) => path.join(providerRoot, fileName));

    for (const filePath of providerFiles) {
      const source = read(filePath);
      expect(source).toContain('PROVIDER_TIMEOUTS_MS');
      expect(
        source.includes('AbortSignal.timeout(') || source.includes('timeout:'),
      ).toBe(true);
    }
  });
});
