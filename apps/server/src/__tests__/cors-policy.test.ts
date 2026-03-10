import { describe, expect, it } from 'vitest';
import {
  createAuthCorsPolicy,
  createBearerCorsPolicy,
} from '../middleware/cors-policy';

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

describe('createAuthCorsPolicy', () => {
  it('always returns an explicit allowlist for credentialed auth routes', () => {
    const policy = createAuthCorsPolicy({
      publicWebUrl: 'https://studio.example.com/app',
    });

    expect(policy.credentials).toBe(true);
    expect(policy.origin).toEqual(['https://studio.example.com']);
  });

  it('normalizes and de-duplicates additional trusted origins', () => {
    const policy = createAuthCorsPolicy({
      publicWebUrl: 'https://studio.example.com',
      corsOrigins:
        'https://admin.example.com/path, *, https://admin.example.com, https://studio.example.com',
    });

    expect(policy.credentials).toBe(true);
    expect(policy.origin).toEqual([
      'https://studio.example.com',
      'https://admin.example.com',
    ]);
  });
});
