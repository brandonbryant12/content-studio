import { describe, it, expect, afterEach } from 'vitest';
import { Effect } from 'effect';
import { loadEnv, EnvError } from '../lib/env';

describe('loadEnv', () => {
  const originalEnv = { ...process.env }; // eslint-disable-line no-restricted-properties

  afterEach(() => {
    // eslint-disable-next-line no-restricted-properties
    process.env = { ...originalEnv };
  });

  it('returns env when GEMINI_API_KEY is set', async () => {
    // eslint-disable-next-line no-restricted-properties
    process.env.GEMINI_API_KEY = 'test-key-123';

    const result = await Effect.runPromise(loadEnv());
    expect(result.GEMINI_API_KEY).toBe('test-key-123');
  });

  it('fails with EnvError when GEMINI_API_KEY is missing', async () => {
    // eslint-disable-next-line no-restricted-properties
    delete process.env.GEMINI_API_KEY;

    const exit = await Effect.runPromiseExit(loadEnv());

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(EnvError);
      expect(exit.cause.error.message).toContain('GEMINI_API_KEY');
    }
  });
});
