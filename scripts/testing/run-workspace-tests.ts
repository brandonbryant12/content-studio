import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  getTestConnectionString,
  stopPostgresContainer,
} from '../../packages/testing/src/testcontainers/postgres';

type TestProfile = 'local' | 'ci';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const PROFILE_ARG_PREFIX = '--profile=';
const profileArg = process.argv
  .find((arg) => arg.startsWith(PROFILE_ARG_PREFIX))
  ?.slice(PROFILE_ARG_PREFIX.length);

const resolveProfile = (): TestProfile => {
  if (profileArg === 'local' || profileArg === 'ci') {
    return profileArg;
  }

  // eslint-disable-next-line no-restricted-properties -- test runner profile selection depends on CI env
  return process.env.CI ? 'ci' : 'local';
};

const profile = resolveProfile();

const PROFILE_DEFAULTS: Record<TestProfile, Record<string, string>> = {
  local: {
    TURBO_TEST_CONCURRENCY: '50%',
    VITEST_MAX_WORKERS: '50%',
    VITEST_MAX_WORKERS_API: '35%',
    VITEST_MAX_WORKERS_MEDIA: '35%',
    VITEST_MAX_WORKERS_WEB: '40%',
  },
  ci: {
    TURBO_TEST_CONCURRENCY: '100%',
    VITEST_MAX_WORKERS: '100%',
    VITEST_MAX_WORKERS_API: '50%',
    VITEST_MAX_WORKERS_MEDIA: '50%',
    VITEST_MAX_WORKERS_WEB: '60%',
  },
};

const withProfileDefaults = (
  sourceEnv: NodeJS.ProcessEnv,
  selectedProfile: TestProfile,
): NodeJS.ProcessEnv => {
  const mergedEnv: NodeJS.ProcessEnv = { ...sourceEnv };
  for (const [key, value] of Object.entries(PROFILE_DEFAULTS[selectedProfile])) {
    if (!mergedEnv[key]) {
      mergedEnv[key] = value;
    }
  }
  return mergedEnv;
};

const extraArgsStartIndex = process.argv.indexOf('--');
const extraTurboArgs =
  extraArgsStartIndex === -1 ? [] : process.argv.slice(extraArgsStartIndex + 1);

const runTurboTestTask = async (env: NodeJS.ProcessEnv): Promise<number> =>
  new Promise((resolve, reject) => {
    const homeCacheDir = process.env.HOME
      ? path.join(process.env.HOME, '.cache/turbo/content-studio')
      : path.join(repoRoot, '.cache/turbo/content-studio');
    const cacheDir = process.env.TURBO_CACHE_DIR ?? homeCacheDir;
    const concurrency = env.TURBO_TEST_CONCURRENCY ?? '50%';

    const args = [
      'turbo',
      'run',
      'test',
      '--continue',
      '--filter=./packages/*',
      '--filter=./apps/*',
      '--cache-dir',
      cacheDir,
      `--concurrency=${concurrency}`,
      ...extraTurboArgs,
    ];

    const child = spawn('pnpm', args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });

const main = async () => {
  const env = withProfileDefaults(process.env, profile);
  let startedSharedContainer = false;

  try {
    if (!env.TEST_POSTGRES_URL) {
      const connectionString = await getTestConnectionString();
      env.TEST_POSTGRES_URL = connectionString;
      startedSharedContainer = true;
    }

    const exitCode = await runTurboTestTask(env);
    process.exitCode = exitCode;
  } finally {
    if (startedSharedContainer) {
      await stopPostgresContainer();
    }
  }
};

await main();
