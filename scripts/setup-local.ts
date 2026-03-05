import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const runCommand = async (
  command: string,
  args: string[],
  cwd = repoRoot,
  env = process.env,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal || code !== 0) {
        reject(
          new Error(
            `${command} ${args.join(' ')} failed with ${signal ?? code ?? 1}`,
          ),
        );
        return;
      }

      resolve();
    });
  });
};

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
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
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

const main = async (): Promise<void> => {
  console.log('Copying .env.example files...');
  await runCommand('pnpm', ['env:copy-example']);

  console.log('Installing git hooks...');
  await runCommand('pnpm', ['hooks:install']);

  console.log('Starting local Docker services...');
  await runCommand('docker', [
    'compose',
    'up',
    '-d',
    'db',
    'redis',
    'minio',
    'minio-init',
  ]);

  console.log('Waiting for local services...');
  await waitForTcp(5432, 'PostgreSQL', 60_000);
  await waitForTcp(6379, 'Redis', 60_000);
  await waitForHttp('http://127.0.0.1:9001/minio/health/live', 'MinIO', 60_000);
  await waitForMinioInit(60_000);

  console.log('Pushing the development schema...');
  await runCommand('pnpm', ['--filter', '@repo/db', 'push']);

  console.log('Installing Playwright Chromium...');
  await runCommand('pnpm', [
    '--filter',
    'web',
    'exec',
    'playwright',
    'install',
    'chromium',
  ]);

  console.log('\nLocal development setup is ready.');
};

await main();
