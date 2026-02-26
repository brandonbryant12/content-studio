import { describe, expect, it, vi } from 'vitest';
import {
  parseArgs,
  runWorkflowMemoryPreflight,
} from '../guardrails/workflow-memory-preflight.js';

type MockResult = {
  status: number | null;
  stdout?: string;
  stderr?: string;
};

describe('workflow-memory preflight', () => {
  it('parses bootstrap and path overrides', () => {
    const parsed = parseArgs([
      '--bootstrap',
      '--cwd',
      '/tmp/repo',
      '--memory-path',
      'custom/memory',
    ]);

    expect(parsed).toEqual({
      bootstrap: true,
      cwd: '/tmp/repo',
      memoryPath: 'custom/memory',
    });
  });

  it('fails fast with one remediation when tsx is missing and bootstrap is disabled', () => {
    const logs: string[] = [];
    const errors: string[] = [];
    const commandRunner = vi
      .fn<[string, string, string[]], MockResult>()
      .mockReturnValue({
        status: 1,
        stderr: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "tsx" not found',
      });

    const exitCode = runWorkflowMemoryPreflight({
      bootstrap: false,
      cwd: '/tmp/repo',
      memoryPath: 'agent-engine/workflow-memory',
      logger: (line) => logs.push(line),
      errorLogger: (line) => errors.push(line),
      commandRunner,
    });

    expect(exitCode).toBe(1);
    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(errors.filter((line) => line.includes('remediation:')).length).toBe(1);
    expect(errors.join('\n')).toContain('missing tsx runtime dependency.');
    expect(logs[0]).toContain('memory path');
  });

  it('bootstraps dependencies and succeeds when retry finds tsx', () => {
    const commandRunner = vi
      .fn<[string, string, string[]], MockResult>()
      .mockImplementationOnce(() => ({
        status: 1,
        stderr: 'Command "tsx" not found',
      }))
      .mockImplementationOnce(() => ({
        status: 0,
        stdout: 'install ok',
      }))
      .mockImplementationOnce(() => ({
        status: 0,
        stdout: 'tsx 4.20.6',
      }));

    const exitCode = runWorkflowMemoryPreflight({
      bootstrap: true,
      cwd: '/tmp/repo',
      memoryPath: 'agent-engine/workflow-memory',
      commandRunner,
      logger: () => undefined,
      errorLogger: () => undefined,
    });

    expect(exitCode).toBe(0);
    expect(commandRunner).toHaveBeenNthCalledWith(2, '/tmp/repo', expect.any(String), [
      'install',
      '--frozen-lockfile',
      '--prefer-offline',
    ]);
  });
});
