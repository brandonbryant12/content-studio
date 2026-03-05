import { describe, expect, it } from 'vitest';
import { AuthMode, buildTrustedOrigins } from '../server/auth';

describe('buildTrustedOrigins', () => {
  it('exposes only supported auth modes', () => {
    expect(Object.values(AuthMode)).toEqual(['dev-password', 'sso-only']);
  });

  it('includes primary web origin and normalized extra origins', () => {
    const origins = buildTrustedOrigins('https://studio.example.com/app', [
      'https://admin.example.com/path',
      'https://studio.example.com',
    ]);

    expect(origins).toEqual([
      'https://studio.example.com',
      'https://admin.example.com',
    ]);
  });

  it('preserves wildcard trusted-origin patterns', () => {
    const origins = buildTrustedOrigins('http://localhost:8085', [
      'http://localhost:*',
      'http://127.0.0.1:*',
    ]);

    expect(origins).toEqual([
      'http://localhost:8085',
      'http://localhost:*',
      'http://127.0.0.1:*',
    ]);
  });
});
