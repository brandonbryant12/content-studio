import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..', '..');

const packageJsonPath = path.join(repoRoot, 'package.json');
const docsPath = path.join(repoRoot, 'docs/testing/invariants.md');
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

    for (const entry of fs.readdirSync(workspaceRootPath, { withFileTypes: true })) {
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

    expect(rootScript, 'Missing test:invariants script in package.json').toBeTypeOf(
      'string',
    );

    const packageInvariantFiles = getWorkspacePackageJsonPaths().flatMap(
      (workspacePackageJsonPath) => {
        const workspacePackageJson = JSON.parse(
          fs.readFileSync(workspacePackageJsonPath, 'utf-8'),
        );
        const invariantScript = workspacePackageJson?.scripts?.['test:invariants'];

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
});
