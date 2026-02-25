import { describe, expect, it } from 'vitest';
import { createCredentialedCorsPolicy } from '../middleware/cors-policy';

describe('createCredentialedCorsPolicy', () => {
  it('rejects wildcard origins outside local development', () => {
    expect(() =>
      createCredentialedCorsPolicy({
        publicWebUrl: 'https://studio.example.com',
        corsOrigins: '*',
        nodeEnv: 'production',
      }),
    ).toThrow('CORS_ORIGINS=* is only allowed');
  });

  it('allows wildcard origin reflection in local development', () => {
    const policy = createCredentialedCorsPolicy({
      publicWebUrl: 'http://localhost:8085',
      corsOrigins: '*',
      nodeEnv: 'development',
    });

    expect(policy.credentials).toBe(true);
    expect(typeof policy.origin).toBe('function');
    expect((policy.origin as (origin: string) => string | null)('http://localhost:3000')).toBe(
      'http://localhost:3000',
    );
  });

  it('returns a normalized allowlist for non-wildcard config', () => {
    const policy = createCredentialedCorsPolicy({
      publicWebUrl: 'https://studio.example.com/app',
      corsOrigins: 'https://admin.example.com/path, https://studio.example.com',
      nodeEnv: 'production',
    });

    expect(policy.credentials).toBe(true);
    expect(policy.origin).toEqual([
      'https://studio.example.com',
      'https://admin.example.com',
    ]);
  });
});
