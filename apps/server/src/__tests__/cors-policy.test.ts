import { describe, expect, it } from 'vitest';
import { createBearerCorsPolicy } from '../middleware/cors-policy';

describe('createBearerCorsPolicy', () => {
  it('defaults to wildcard origin when CORS_ORIGINS is unset', () => {
    const policy = createBearerCorsPolicy({
      publicWebUrl: 'https://studio.example.com',
    });

    expect(policy.credentials).toBe(false);
    expect(policy.origin).toBe('*');
  });

  it('allows wildcard CORS_ORIGINS in all environments', () => {
    const policy = createBearerCorsPolicy({
      publicWebUrl: 'https://studio.example.com',
      corsOrigins: '*',
    });

    expect(policy.credentials).toBe(false);
    expect(policy.origin).toBe('*');
  });

  it('returns a normalized allowlist for non-wildcard config', () => {
    const policy = createBearerCorsPolicy({
      publicWebUrl: 'https://studio.example.com/app',
      corsOrigins: 'https://admin.example.com/path, https://studio.example.com',
    });

    expect(policy.credentials).toBe(false);
    expect(policy.origin).toEqual([
      'https://studio.example.com',
      'https://admin.example.com',
    ]);
  });

  it('normalizes, de-duplicates, and ignores wildcard entries in explicit lists', () => {
    const policy = createBearerCorsPolicy({
      publicWebUrl: 'https://studio.example.com',
      corsOrigins:
        'https://admin.example.com, https://admin.example.com/path, *, https://studio.example.com',
    });

    expect(policy.credentials).toBe(false);
    expect(policy.origin).toEqual([
      'https://studio.example.com',
      'https://admin.example.com',
    ]);
  });
});
