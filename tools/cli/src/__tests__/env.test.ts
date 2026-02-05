import { describe, it, expect, afterEach } from 'vitest';
import { Effect } from 'effect';
import { loadEnv } from '../lib/env';

describe('loadEnv', () => {
  const originalEnv = { ...process.env }; // eslint-disable-line no-restricted-properties

  afterEach(() => {
    // eslint-disable-next-line no-restricted-properties
    process.env = { ...originalEnv };
  });

  it('returns env with GEMINI_API_KEY when set', async () => {
    // eslint-disable-next-line no-restricted-properties
    process.env.GEMINI_API_KEY = 'test-key-123';

    const result = await Effect.runPromise(loadEnv());
    expect(result.GEMINI_API_KEY).toBe('test-key-123');
  });

  it('returns env with GOOGLE_VERTEX_API_KEY when set', async () => {
    // eslint-disable-next-line no-restricted-properties
    process.env.GOOGLE_VERTEX_API_KEY = 'vertex-key-456';

    const result = await Effect.runPromise(loadEnv());
    expect(result.GOOGLE_VERTEX_API_KEY).toBe('vertex-key-456');
  });

  it('succeeds when no API keys are set', async () => {
    // eslint-disable-next-line no-restricted-properties
    delete process.env.GEMINI_API_KEY;
    // eslint-disable-next-line no-restricted-properties
    delete process.env.GOOGLE_VERTEX_API_KEY;

    const result = await Effect.runPromise(loadEnv());
    expect(result.GEMINI_API_KEY).toBeUndefined();
    expect(result.GOOGLE_VERTEX_API_KEY).toBeUndefined();
  });
});
