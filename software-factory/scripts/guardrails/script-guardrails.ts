import { promises as fs } from 'node:fs';
import path from 'node:path';
import { REQUIRED_UTILITY_PACKAGE_SCRIPTS } from '../factory/utility-command-manifest';

export const ENTRY_SCRIPT_PATHS = [
  'software-factory/scripts/factory/software-factory.ts',
] as const;

export const REQUIRED_PACKAGE_SCRIPTS: Record<string, string> = {
  'software-factory': 'pnpm exec tsx software-factory/scripts/factory/software-factory.ts',
  'test:scripts': 'vitest run --config software-factory/scripts/vitest.config.ts',
  ...REQUIRED_UTILITY_PACKAGE_SCRIPTS,
  'ready-for-dev': 'pnpm software-factory operation run ready-for-dev-executor',
};

const ENTRY_DIRECTORIES = ['factory', 'skills', 'workflow-memory', 'workflows', 'guardrails', 'spec'] as const;
const RUN_SCRIPT_MAIN_RE = /^\s*runScript\(main\);\s*$/m;
const ENTRY_EXIT_SIDE_EFFECT_RE = /\bprocess\.exitCode\s*=/;
const ROOT_ENTRY_SCRIPT = 'software-factory/scripts/factory/software-factory.ts';
const EFFECT_RUN_PROMISE_ALLOWLIST = new Set<string>([
  ROOT_ENTRY_SCRIPT,
  'software-factory/scripts/lib/command.ts',
  'software-factory/scripts/lib/effect-script.ts',
]);
const THROW_NEW_ERROR_ALLOWLIST = new Set<string>([
  'software-factory/scripts/workflow-memory/add-entry.ts',
  'software-factory/scripts/workflow-memory/check-coverage.ts',
  'software-factory/scripts/workflow-memory/compact-memory.ts',
  'software-factory/scripts/workflow-memory/sync-git.ts',
  'software-factory/scripts/workflows/registry.ts',
  'software-factory/scripts/workflows/generate-readme.ts',
  'software-factory/scripts/skills/check-quality.ts',
  'software-factory/scripts/spec/utils.ts',
]);
const COMMAND_SERVICE_DIRECTORIES = [
  'software-factory/scripts/factory/',
  'software-factory/scripts/skills/',
  'software-factory/scripts/workflows/',
  'software-factory/scripts/workflow-memory/',
  'software-factory/scripts/guardrails/',
  'software-factory/scripts/spec/',
];

export type ScriptGuardrailIssue = {
  code:
    | 'missing-package-script'
    | 'script-command-mismatch'
    | 'missing-entry-file'
    | 'missing-effect-runner-import'
    | 'missing-run-script-call'
    | 'entry-script-exit-side-effect'
    | 'legacy-argv-parser'
    | 'non-root-process-argv'
    | 'non-root-run-script'
    | 'untracked-entry-script'
    | 'legacy-js-script'
    | 'legacy-mjs-script'
    | 'missing-vitest-project'
    | 'promise-first-command-service'
    | 'command-throw-new-error'
    | 'non-root-effect-run-promise'
    | 'operation-registry-drift'
    | 'utility-command-manifest-drift';
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

const collectLegacyScripts = async (
  rootDir: string,
): Promise<{ js: string[]; mjs: string[] }> => {
  const scriptRoot = path.join(rootDir, 'software-factory', 'scripts');
  const jsResults: string[] = [];
  const mjsResults: string[] = [];

  const walk = async (directory: string): Promise<void> => {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.js')) {
        jsResults.push(normalizePath(path.relative(rootDir, absolutePath)));
      }
      if (entry.isFile() && entry.name.endsWith('.mjs')) {
        mjsResults.push(normalizePath(path.relative(rootDir, absolutePath)));
      }
    }
  };

  await walk(scriptRoot);

  return { js: jsResults.sort(), mjs: mjsResults.sort() };
};

const collectTypeScriptSources = async (rootDir: string): Promise<string[]> => {
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

      if (entry.isFile() && entry.name.endsWith('.ts')) {
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

  if (
    repoPath !== 'software-factory/scripts/factory/software-factory.ts' &&
    ENTRY_EXIT_SIDE_EFFECT_RE.test(source)
  ) {
    issues.push({
      code: 'entry-script-exit-side-effect',
      path: repoPath,
      message: 'Entry scripts must return status codes from main instead of mutating process.exitCode.',
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
          'Found a legacy standalone script entrypoint. Use software-factory/scripts/factory/software-factory.ts as the only CLI entrypoint.',
      });
    }
  }

  const tsSources = await collectTypeScriptSources(rootDir);
  const utilityManifestSource = await fs.readFile(
    path.join(rootDir, 'software-factory/scripts/factory/utility-command-manifest.ts'),
    'utf8',
  );
  const utilityHandlerSource = await fs.readFile(
    path.join(rootDir, 'software-factory/scripts/factory/utility-command-handlers.ts'),
    'utf8',
  );
  const cliSource = await fs.readFile(path.join(rootDir, ROOT_ENTRY_SCRIPT), 'utf8');
  const operationsRegistrySource = await fs.readFile(
    path.join(rootDir, 'software-factory/operations/registry.json'),
    'utf8',
  );
  for (const sourcePath of tsSources) {
    const isTestSource = sourcePath.includes('/__tests__/');
    if (sourcePath === ROOT_ENTRY_SCRIPT) {
      continue;
    }

    const source = await fs.readFile(path.join(rootDir, sourcePath), 'utf8');
    if (/\bfunction\s+parseArgs\s*\(/.test(source) || /\bconst\s+parseArgs\s*=/.test(source)) {
      issues.push({
        code: 'legacy-argv-parser',
        path: sourcePath,
        message: 'Legacy parseArgs helper is not allowed. Parse CLI input only at the root @effect/cli command layer.',
      });
    }

    if (
      COMMAND_SERVICE_DIRECTORIES.some((prefix) => sourcePath.startsWith(prefix)) &&
      /^\s*throw\s+new\s+Error\s*\(/m.test(source) &&
      !THROW_NEW_ERROR_ALLOWLIST.has(sourcePath)
    ) {
      issues.push({
        code: 'command-throw-new-error',
        path: sourcePath,
        message: 'Command modules must use tagged domain errors, not throw new Error(...).',
      });
    }

    if (
      sourcePath !== 'software-factory/scripts/guardrails/script-guardrails.ts' &&
      /\bprocess\.argv\b/.test(source)
    ) {
      issues.push({
        code: 'non-root-process-argv',
        path: sourcePath,
        message: 'Only software-factory/scripts/factory/software-factory.ts may reference process.argv.',
      });
    }

    if (
      sourcePath !== 'software-factory/scripts/guardrails/script-guardrails.ts' &&
      /\brunScript\s*\(/.test(source)
    ) {
      issues.push({
        code: 'non-root-run-script',
        path: sourcePath,
        message: 'Only software-factory/scripts/factory/software-factory.ts may call runScript(...).',
      });
    }

    if (
      sourcePath !== ROOT_ENTRY_SCRIPT &&
      !isTestSource &&
      /\bEffect\.runPromise(?:Exit)?\s*\(/.test(source) &&
      !EFFECT_RUN_PROMISE_ALLOWLIST.has(sourcePath)
    ) {
      issues.push({
        code: 'non-root-effect-run-promise',
        path: sourcePath,
        message: 'Effect.runPromise* is only allowed in the root CLI runner.',
      });
    }

    if (!isTestSource && /\bexport\s+const\s+run[A-Za-z0-9_]+\s*=\s*async\s*\(/.test(source)) {
      issues.push({
        code: 'promise-first-command-service',
        path: sourcePath,
        message:
          'Command services must expose Effect-returning run* APIs, not Promise-first async exports.',
      });
    }
  }

  const manifestKeys = new Set(
    [...utilityManifestSource.matchAll(/key:\s*"([^"]+)"/g)].map((match) => match[1]),
  );
  const handlerKeys = new Set(
    [...utilityHandlerSource.matchAll(/case\s+"([^"]+)":/g)].map((match) => match[1]),
  );
  const manifestOnly = [...manifestKeys].filter((key) => !handlerKeys.has(key));
  const handlerOnly = [...handlerKeys].filter((key) => !manifestKeys.has(key));
  if (manifestOnly.length > 0 || handlerOnly.length > 0) {
    issues.push({
      code: 'utility-command-manifest-drift',
      path: 'software-factory/scripts/factory/utility-command-manifest.ts',
      message: `Manifest/handler command drift detected. manifest-only=[${manifestOnly.join(', ')}] handler-only=[${handlerOnly.join(', ')}]`,
    });
  }

  let registryParsed: { operations?: Array<{ id?: unknown; args?: unknown }> } | null = null;
  try {
    const parsed = JSON.parse(operationsRegistrySource) as unknown;
    if (parsed && typeof parsed === 'object') {
      registryParsed = parsed as { operations?: Array<{ id?: unknown; args?: unknown }> };
    }
  } catch (error) {
    issues.push({
      code: 'operation-registry-drift',
      path: 'software-factory/operations/registry.json',
      message: `Operation registry JSON parse failed: ${String(error)}`,
    });
  }

  if (
    !cliSource.includes('buildDynamicOperationRunCommand') ||
    !cliSource.includes('operation run <operation-id>')
  ) {
    issues.push({
      code: 'operation-registry-drift',
      path: ROOT_ENTRY_SCRIPT,
      message:
        'Root CLI is missing dynamic operation run wiring. Expected buildDynamicOperationRunCommand + operation-id usage.',
    });
  }

  const operations = Array.isArray(registryParsed?.operations) ? registryParsed.operations : [];
  for (const operation of operations) {
    const id = typeof operation.id === 'string' ? operation.id : '(unknown)';
    const args = Array.isArray(operation.args) ? operation.args : [];
    const argNames = args
      .map((entry) =>
        entry && typeof entry === 'object' ? (entry as { name?: unknown }).name : undefined,
      )
      .filter((name): name is string => typeof name === 'string');

    if (new Set(argNames).size !== argNames.length) {
      issues.push({
        code: 'operation-registry-drift',
        path: 'software-factory/operations/registry.json',
        message: `Operation '${id}' has duplicate arg names.`,
      });
    }

    for (const argName of argNames) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(argName)) {
        issues.push({
          code: 'operation-registry-drift',
          path: 'software-factory/operations/registry.json',
          message: `Operation '${id}' has non-kebab arg '${argName}'.`,
        });
      }
    }
  }

  const legacyScripts = await collectLegacyScripts(rootDir);
  for (const legacyPath of legacyScripts.js) {
    issues.push({
      code: 'legacy-js-script',
      path: legacyPath,
      message: 'Legacy .js script found under software-factory/scripts; migrate to Effect TypeScript.',
    });
  }

  const legacyMjsScripts = legacyScripts.mjs;
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
