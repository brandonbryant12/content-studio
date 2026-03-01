import { promises as fs } from 'node:fs';
import path from 'node:path';

export const ENTRY_SCRIPT_PATHS = [
  'software-factory/scripts/factory/software-factory.ts',
  'software-factory/scripts/skills/check-quality.ts',
  'software-factory/scripts/workflows/generate-readme.ts',
  'software-factory/scripts/workflow-memory/add-entry.ts',
  'software-factory/scripts/workflow-memory/sync-git.ts',
  'software-factory/scripts/workflow-memory/retrieve.ts',
  'software-factory/scripts/workflow-memory/compact-memory.ts',
  'software-factory/scripts/workflow-memory/check-coverage.ts',
  'software-factory/scripts/workflow-memory/replay-scenarios.ts',
  'software-factory/scripts/guardrails/lint-scripts.ts',
] as const;

export const REQUIRED_PACKAGE_SCRIPTS: Record<string, string> = {
  'software-factory': 'pnpm exec tsx software-factory/scripts/factory/software-factory.ts',
  'test:scripts': 'vitest run --config software-factory/scripts/vitest.config.ts',
  'scripts:lint': 'pnpm exec tsx software-factory/scripts/guardrails/lint-scripts.ts',
  'skills:check': 'pnpm exec tsx software-factory/scripts/skills/check-quality.ts',
  'skills:check:strict': 'pnpm exec tsx software-factory/scripts/skills/check-quality.ts --strict',
  'workflows:generate': 'pnpm exec tsx software-factory/scripts/workflows/generate-readme.ts',
  'workflow-memory:add-entry': 'pnpm exec tsx software-factory/scripts/workflow-memory/add-entry.ts',
  'workflow-memory:preflight': 'node software-factory/scripts/guardrails/workflow-memory-preflight.js',
  'workflow-memory:sync': 'pnpm exec tsx software-factory/scripts/workflow-memory/sync-git.ts',
  'workflow-memory:retrieve': 'pnpm exec tsx software-factory/scripts/workflow-memory/retrieve.ts',
  'workflow-memory:compact': 'pnpm exec tsx software-factory/scripts/workflow-memory/compact-memory.ts',
  'workflow-memory:coverage': 'pnpm exec tsx software-factory/scripts/workflow-memory/check-coverage.ts',
  'workflow-memory:coverage:strict':
    'pnpm exec tsx software-factory/scripts/workflow-memory/check-coverage.ts --strict',
  'scenario:validate': 'pnpm exec tsx software-factory/scripts/workflow-memory/replay-scenarios.ts',
  'scenario:validate:strict':
    'pnpm exec tsx software-factory/scripts/workflow-memory/replay-scenarios.ts --strict',
};

const ENTRY_DIRECTORIES = ['factory', 'skills', 'workflow-memory', 'workflows', 'guardrails'] as const;
const RUN_SCRIPT_MAIN_RE = /^\s*runScript\(main\);\s*$/m;

export type ScriptGuardrailIssue = {
  code:
    | 'missing-package-script'
    | 'script-command-mismatch'
    | 'missing-entry-file'
    | 'missing-effect-runner-import'
    | 'missing-run-script-call'
    | 'untracked-entry-script'
    | 'legacy-mjs-script'
    | 'missing-vitest-project';
  message: string;
  path?: string;
};

const normalizePath = (value: string): string => value.split(path.sep).join('/');

const readPackageJson = async (rootDir: string): Promise<Record<string, unknown>> => {
  const packagePath = path.join(rootDir, 'package.json');
  const raw = await fs.readFile(packagePath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
};

const collectEntryScripts = async (rootDir: string): Promise<string[]> => {
  const results: string[] = [];

  for (const entryDir of ENTRY_DIRECTORIES) {
    const absoluteDir = path.join(rootDir, 'software-factory', 'scripts', entryDir);
    let entries;

    try {
      entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    } catch (error) {
      if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) {
        continue;
      }

      const repoPath = normalizePath(
        path.join('software-factory', 'scripts', entryDir, entry.name),
      );
      const source = await fs.readFile(path.join(rootDir, repoPath), 'utf8');
      if (!RUN_SCRIPT_MAIN_RE.test(source)) {
        continue;
      }

      results.push(repoPath);
    }
  }

  return results.sort();
};

const collectLegacyMjsScripts = async (rootDir: string): Promise<string[]> => {
  const scriptRoot = path.join(rootDir, 'software-factory', 'scripts');
  const results: string[] = [];

  const walk = async (directory: string): Promise<void> => {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.mjs')) {
        results.push(normalizePath(path.relative(rootDir, absolutePath)));
      }
    }
  };

  await walk(scriptRoot);

  return results.sort();
};

const checkEntryFileContracts = async (
  rootDir: string,
  repoPath: string,
): Promise<ScriptGuardrailIssue[]> => {
  const issues: ScriptGuardrailIssue[] = [];
  const absolutePath = path.join(rootDir, repoPath);

  let source: string;
  try {
    source = await fs.readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      issues.push({
        code: 'missing-entry-file',
        path: repoPath,
        message: 'Expected script entry file is missing.',
      });
      return issues;
    }
    throw error;
  }

  if (!source.includes('effect-script')) {
    issues.push({
      code: 'missing-effect-runner-import',
      path: repoPath,
      message: 'Script entry must import the shared Effect runner.',
    });
  }

  if (!RUN_SCRIPT_MAIN_RE.test(source)) {
    issues.push({
      code: 'missing-run-script-call',
      path: repoPath,
      message: 'Script entry must terminate with runScript(main);',
    });
  }

  return issues;
};

export const checkScriptGuardrails = async (
  rootDir = process.cwd(),
): Promise<ScriptGuardrailIssue[]> => {
  const issues: ScriptGuardrailIssue[] = [];
  const packageJson = await readPackageJson(rootDir);
  const scripts =
    packageJson.scripts && typeof packageJson.scripts === 'object'
      ? (packageJson.scripts as Record<string, unknown>)
      : {};

  for (const [scriptName, expectedCommand] of Object.entries(REQUIRED_PACKAGE_SCRIPTS)) {
    const actual = scripts[scriptName];

    if (typeof actual !== 'string') {
      issues.push({
        code: 'missing-package-script',
        message: `Missing package.json script: ${scriptName}`,
      });
      continue;
    }

    if (actual !== expectedCommand) {
      issues.push({
        code: 'script-command-mismatch',
        message: `Expected package.json script '${scriptName}' to equal '${expectedCommand}', found '${actual}'.`,
      });
    }
  }

  for (const entryPath of ENTRY_SCRIPT_PATHS) {
    const entryIssues = await checkEntryFileContracts(rootDir, entryPath);
    issues.push(...entryIssues);
  }

  const trackedEntries = new Set<string>(ENTRY_SCRIPT_PATHS);
  const discoveredEntries = await collectEntryScripts(rootDir);
  for (const entryPath of discoveredEntries) {
    if (!trackedEntries.has(entryPath)) {
      issues.push({
        code: 'untracked-entry-script',
        path: entryPath,
        message:
          'Found a script entrypoint that is not covered by guardrails. Add it to ENTRY_SCRIPT_PATHS and package.json scripts.',
      });
    }
  }

  const legacyMjsScripts = await collectLegacyMjsScripts(rootDir);
  for (const legacyPath of legacyMjsScripts) {
    issues.push({
      code: 'legacy-mjs-script',
      path: legacyPath,
      message: 'Legacy .mjs script found under software-factory/scripts; migrate to Effect TypeScript.',
    });
  }

  const rootVitestPath = path.join(rootDir, 'vitest.config.ts');
  const rootVitestSource = await fs.readFile(rootVitestPath, 'utf8');
  if (!rootVitestSource.includes('software-factory/scripts/vitest.config.ts')) {
    issues.push({
      code: 'missing-vitest-project',
      path: 'vitest.config.ts',
      message:
        'Root vitest projects must include software-factory/scripts/vitest.config.ts so scripts are covered by pnpm test.',
    });
  }

  return issues;
};
