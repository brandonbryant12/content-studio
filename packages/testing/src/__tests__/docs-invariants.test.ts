import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..', '..');

const packageJsonPath = path.join(repoRoot, 'package.json');
const docsPath = path.join(repoRoot, 'docs/testing/invariants.md');
const useCaseTestsDocPath = path.join(
  repoRoot,
  'docs/testing/use-case-tests.md',
);
const datadogDocPath = path.join(repoRoot, 'docs/architecture/datadog.md');
const observabilityDocPath = path.join(
  repoRoot,
  'docs/architecture/observability.md',
);
const workspaceRoots = ['apps', 'packages', 'tools'] as const;

const normalizeInvariantFilePath = (
  token: string,
  packageDir: string | null,
): string => {
  const normalized = token
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');

  if (
    !packageDir ||
    normalized.startsWith('apps/') ||
    normalized.startsWith('packages/') ||
    normalized.startsWith('tools/')
  ) {
    return normalized;
  }

  return `${packageDir}/${normalized}`;
};

const extractInvariantFiles = (
  script: string,
  packageDir: string | null,
): string[] => {
  const tokens = script.split(/\s+/).filter(Boolean);
  return tokens
    .filter(
      (token) =>
        token.endsWith('.test.ts') ||
        token.endsWith('.test.tsx') ||
        token.endsWith('.integration.test.ts') ||
        token.endsWith('.integration.test.tsx'),
    )
    .map((token) => normalizeInvariantFilePath(token, packageDir));
};

const getWorkspacePackageJsonPaths = (): string[] => {
  const packageJsonPaths: string[] = [];

  for (const workspaceRoot of workspaceRoots) {
    const workspaceRootPath = path.join(repoRoot, workspaceRoot);
    if (!fs.existsSync(workspaceRootPath)) {
      continue;
    }

    for (const entry of fs.readdirSync(workspaceRootPath, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const workspacePackageJsonPath = path.join(
        workspaceRootPath,
        entry.name,
        'package.json',
      );
      if (fs.existsSync(workspacePackageJsonPath)) {
        packageJsonPaths.push(workspacePackageJsonPath);
      }
    }
  }

  return packageJsonPaths;
};

describe('invariant docs sync', () => {
  it('lists every test file referenced by package test:invariants scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const rootScript = packageJson?.scripts?.['test:invariants'];

    expect(
      rootScript,
      'Missing test:invariants script in package.json',
    ).toBeTypeOf('string');

    const packageInvariantFiles = getWorkspacePackageJsonPaths().flatMap(
      (workspacePackageJsonPath) => {
        const workspacePackageJson = JSON.parse(
          fs.readFileSync(workspacePackageJsonPath, 'utf-8'),
        );
        const invariantScript =
          workspacePackageJson?.scripts?.['test:invariants'];

        if (typeof invariantScript !== 'string') {
          return [];
        }

        const packageDir = path
          .relative(repoRoot, path.dirname(workspacePackageJsonPath))
          .replace(/\\/g, '/');
        return extractInvariantFiles(invariantScript, packageDir);
      },
    );

    const rootInvariantFiles = extractInvariantFiles(rootScript, null);
    const invariantFiles = Array.from(
      new Set([...rootInvariantFiles, ...packageInvariantFiles]),
    );

    expect(invariantFiles.length).toBeGreaterThan(0);

    const docs = fs.readFileSync(docsPath, 'utf-8');
    const missing = invariantFiles.filter((file) => !docs.includes(file));

    expect(
      missing,
      'Invariant docs must list every test:invariants file path.',
    ).toEqual([]);
  });

  it('keeps Datadog telemetry lifecycle docs aligned with runtime contract', () => {
    const datadogDoc = fs.readFileSync(datadogDocPath, 'utf-8');
    const observabilityDoc = fs.readFileSync(observabilityDocPath, 'utf-8');

    expect(observabilityDoc).toContain('Runtime Wiring Pattern');
    expect(datadogDoc).toContain('createServerRuntime(');
    expect(datadogDoc).toContain('telemetryConfig');
    expect(datadogDoc).toContain('runtime.dispose()');
    expect(datadogDoc).toContain('./observability.md#runtime-wiring-pattern');
    expect(datadogDoc).not.toMatch(
      /call\s+`?initTelemetry\(\)`?\s+at\s+startup/i,
    );
    expect(datadogDoc).not.toMatch(
      /`?shutdownTelemetry\(\)`?\s+during\s+graceful\s+shutdown/i,
    );
  });

  it('keeps use-case test mock guidance aligned with the canonical shared-factory pattern', () => {
    const useCaseTestsDoc = fs.readFileSync(useCaseTestsDocPath, 'utf-8');

    expect(useCaseTestsDoc).toContain(
      'packages/media/src/source/use-cases/__tests__/get-source.test.ts',
    );
    expect(useCaseTestsDoc).toContain('@repo/media/test-utils');
    expect(useCaseTestsDoc).toContain('createMockSourceRepo({');
    expect(useCaseTestsDoc).toContain('findByIdForUser: () => Effect.succeed');
    expect(useCaseTestsDoc).toContain(
      "Do not hand-roll repo service objects filled with `Effect.die('not implemented')` in use-case tests.",
    );
    expect(useCaseTestsDoc).toContain(
      'A test-local helper is acceptable only when no shared factory exists yet',
    );
  });
});
