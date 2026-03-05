import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  getTestConnectionString,
  stopPostgresContainer,
} from '../../packages/testing/src/testcontainers/postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const webRoot = path.join(repoRoot, 'apps/web');

const DEFAULT_SERVER_URL = 'http://localhost:3035';
const DEFAULT_WEB_URL = 'http://localhost:8085';
const DEFAULT_MINIO_URL = 'http://localhost:9001';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const READY_TIMEOUT_MS = 60_000;

type ManagedProcess = {
  readonly name: string;
  readonly stop: () => Promise<void>;
  readonly waitForOutput: (text: string, timeoutMs: number) => Promise<void>;
  readonly hasExited: () => boolean;
};

const forwardOutput = (
  name: string,
  stream: NodeJS.ReadableStream | null | undefined,
  write: (chunk: string) => void,
): void => {
  if (!stream) {
    return;
  }

  let remainder = '';
  stream.on('data', (chunk) => {
    const text = `${remainder}${chunk.toString()}`;
    const lines = text.split('\n');
    remainder = lines.pop() ?? '';
    for (const line of lines) {
      write(`[${name}] ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (remainder.length > 0) {
      write(`[${name}] ${remainder}\n`);
    }
  });
};

const startManagedProcess = (
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): ManagedProcess => {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let exited = false;
  let output = '';

  const onChunk = (chunk: string) => {
    output += chunk;
  };

  child.on('error', (error) => {
    process.stderr.write(`[${name}] failed to start: ${String(error)}\n`);
  });
  child.on('exit', () => {
    exited = true;
  });

  forwardOutput(name, child.stdout, (chunk) => {
    onChunk(chunk);
    process.stdout.write(chunk);
  });
  forwardOutput(name, child.stderr, (chunk) => {
    onChunk(chunk);
    process.stderr.write(chunk);
  });

  const waitForOutput = async (
    text: string,
    timeoutMs: number,
  ): Promise<void> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (output.includes(text)) {
        return;
      }

      if (exited) {
        throw new Error(`${name} exited before emitting "${text}"`);
      }

      await delay(250);
    }

    throw new Error(`${name} did not emit "${text}" within ${timeoutMs}ms`);
  };

  const stop = async (): Promise<void> => {
    if (exited) {
      return;
    }

    child.kill('SIGTERM');

    const deadline = Date.now() + 10_000;
    while (!exited && Date.now() < deadline) {
      await delay(250);
    }

    if (!exited) {
      child.kill('SIGKILL');
    }
  };

  return {
    name,
    stop,
    waitForOutput,
    hasExited: () => exited,
  };
};

const runCommand = async (
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<number> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
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

const waitForTcp = async (
  port: number,
  label: string,
  timeoutMs: number,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const connected = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.end();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });

    if (connected) {
      return;
    }

    await delay(500);
  }

  throw new Error(`${label} did not become available on port ${port}`);
};

const waitForHttp = async (
  url: string,
  label: string,
  timeoutMs: number,
  hasExited?: () => boolean,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (hasExited?.()) {
      throw new Error(`${label} exited before becoming ready`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the service comes up.
    }

    await delay(500);
  }

  throw new Error(`${label} did not respond successfully at ${url}`);
};

const waitForMinioInit = async (timeoutMs: number): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const logs = await new Promise<string>((resolve, reject) => {
      const child = spawn(
        'docker',
        ['compose', 'logs', '--no-log-prefix', 'minio-init'],
        {
          cwd: repoRoot,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Failed to read minio-init logs'));
          return;
        }

        resolve(stdout);
      });
    });

    if (logs.includes("MinIO bucket 'content-studio' ready")) {
      return;
    }

    await delay(500);
  }

  throw new Error('MinIO bucket initialization did not complete in time');
};

const ensureComposeServices = async (): Promise<void> => {
  const exitCode = await runCommand(
    'docker',
    ['compose', 'up', '-d', 'redis', 'minio', 'minio-init'],
    repoRoot,
    process.env,
  );

  if (exitCode !== 0) {
    throw new Error('Failed to start Redis/MinIO services with Docker Compose');
  }

  await waitForTcp(6379, 'Redis', READY_TIMEOUT_MS);
  await waitForHttp(
    `${DEFAULT_MINIO_URL}/minio/health/live`,
    'MinIO',
    READY_TIMEOUT_MS,
  );
  await waitForMinioInit(READY_TIMEOUT_MS);
};

const buildE2EEnv = (connectionString: string): NodeJS.ProcessEnv => ({
  ...process.env,
  E2E_MANAGED_SERVICES: '1',
  E2E_API_URL: process.env.E2E_API_URL ?? DEFAULT_SERVER_URL,
  E2E_BASE_URL: process.env.E2E_BASE_URL ?? DEFAULT_WEB_URL,
  PUBLIC_SERVER_URL: process.env.PUBLIC_SERVER_URL ?? DEFAULT_SERVER_URL,
  PUBLIC_WEB_URL: process.env.PUBLIC_WEB_URL ?? DEFAULT_WEB_URL,
  SERVER_POSTGRES_URL: connectionString,
  // The shared Testcontainer helper already pushes schema before the server starts.
  SERVER_RUN_DB_MIGRATIONS_ON_STARTUP: 'false',
  SERVER_REDIS_URL: process.env.SERVER_REDIS_URL ?? DEFAULT_REDIS_URL,
  S3_BUCKET: process.env.S3_BUCKET ?? 'content-studio',
  S3_REGION: process.env.S3_REGION ?? 'us-east-1',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? 'minioadmin',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? 'minioadmin',
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? DEFAULT_MINIO_URL,
  S3_PUBLIC_ENDPOINT: process.env.S3_PUBLIC_ENDPOINT ?? DEFAULT_MINIO_URL,
  USE_MOCK_AI: process.env.USE_MOCK_AI ?? 'true',
});

const main = async (): Promise<void> => {
  const connectionString = await getTestConnectionString();
  const env = buildE2EEnv(connectionString);
  const extraArgs = process.argv.slice(2);
  const processes: ManagedProcess[] = [];

  try {
    console.log('Starting Redis and MinIO for E2E...');
    await ensureComposeServices();

    console.log('Starting test server...');
    const server = startManagedProcess(
      'server',
      'pnpm',
      ['--filter', 'server', 'start:test'],
      repoRoot,
      env,
    );
    processes.push(server);
    await waitForHttp(
      `${DEFAULT_SERVER_URL}/healthcheck`,
      'server',
      READY_TIMEOUT_MS,
      server.hasExited,
    );

    console.log('Starting worker...');
    const worker = startManagedProcess(
      'worker',
      'pnpm',
      ['--filter', 'worker', 'start:test'],
      repoRoot,
      env,
    );
    processes.push(worker);
    await worker.waitForOutput('Worker started', READY_TIMEOUT_MS);

    console.log('Starting web app...');
    const web = startManagedProcess('web', 'pnpm', ['dev'], webRoot, env);
    processes.push(web);
    await waitForHttp(DEFAULT_WEB_URL, 'web', READY_TIMEOUT_MS, web.hasExited);

    const exitCode = await runCommand(
      'pnpm',
      ['exec', 'playwright', 'test', ...extraArgs],
      webRoot,
      env,
    );
    process.exitCode = exitCode;
  } finally {
    for (const managed of processes.reverse()) {
      await managed.stop();
    }

    await stopPostgresContainer();
  }
};

await main();
