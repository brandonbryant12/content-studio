import { describe, expect, it } from 'vitest';
import { buildAuthTrustedOrigins } from '../auth-trusted-origins';

describe('buildAuthTrustedOrigins', () => {
  it('returns normalized explicit origins from CORS_ORIGINS', () => {
    const trustedOrigins = buildAuthTrustedOrigins({
      publicWebUrl: 'https://studio.example.com',
      corsOrigins: 'https://admin.example.com/path, https://studio.example.com',
      nodeEnv: 'production',
    });

    expect(trustedOrigins).toEqual([
      'https://admin.example.com',
      'https://studio.example.com',
    ]);
  });

  it('maps wildcard CORS_ORIGINS to localhost patterns in local dev', () => {
    const trustedOrigins = buildAuthTrustedOrigins({
      publicWebUrl: 'http://localhost:8085',
      corsOrigins: '*',
      nodeEnv: 'development',
    });

    expect(trustedOrigins).toEqual([
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://[::1]:*',
    ]);
  });

  it('uses localhost patterns in local dev when CORS_ORIGINS is unset', () => {
    const trustedOrigins = buildAuthTrustedOrigins({
      publicWebUrl: 'http://localhost:8085',
      nodeEnv: 'development',
    });

    expect(trustedOrigins).toEqual([
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://[::1]:*',
    ]);
  });
});
