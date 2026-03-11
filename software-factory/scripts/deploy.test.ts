import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const deployPath = join(repoRoot, 'deploy');
const deploySource = readFileSync(deployPath, 'utf8');
const deployHarnessSource = deploySource.replace(/\nmain "\$@"\s*$/, '\n');

if (deployHarnessSource === deploySource) {
  throw new Error('Failed to strip deploy main entrypoint for test harness.');
}

const runNormalizeNoProxy = (env: NodeJS.ProcessEnv = {}) => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'content-studio-deploy-'));
  const harnessPath = join(tmpDir, 'deploy-harness.sh');

  writeFileSync(
    harnessPath,
    `${deployHarnessSource}

NO_PROXY_UPDATED="false"
normalize_no_proxy
printf 'NO_PROXY=%s\n' "\${NO_PROXY:-}"
printf 'NO_PROXY_UPDATED=%s\n' "\${NO_PROXY_UPDATED:-}"
`,
    { mode: 0o755 }
  );

  try {
    const output = execFileSync('bash', [harnessPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf8',
    });

    return Object.fromEntries(
      output
        .trimEnd()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const separatorIndex = line.indexOf('=');
          return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
        })
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
};

describe('deploy normalize_no_proxy', () => {
  it('does not crash when NO_PROXY is blank', () => {
    const result = runNormalizeNoProxy({
      NO_PROXY: '',
      HTTPS_PROXY: '',
      HTTP_PROXY: '',
    });

    expect(result.NO_PROXY).toBe('');
    expect(result.NO_PROXY_UPDATED).toBe('false');
  });

  it('adds required internal hosts when a proxy is configured', () => {
    const result = runNormalizeNoProxy({
      NO_PROXY: 'localhost, server',
      HTTPS_PROXY: 'http://proxy.example.com:3128',
      HTTP_PROXY: '',
    });

    expect(result.NO_PROXY.split(',')).toEqual([
      'localhost',
      'server',
      '127.0.0.1',
      '::1',
      'db',
      'redis',
      'minio',
      'minio-init',
      'worker',
      'web',
      'host.docker.internal',
    ]);
    expect(result.NO_PROXY_UPDATED).toBe('true');
  });
});
