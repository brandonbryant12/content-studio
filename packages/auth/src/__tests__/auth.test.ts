import { describe, expect, it } from 'vitest';
import type { DatabaseInstance } from '@repo/db/client';
import { AuthMode, buildTrustedOrigins, createAuth } from '../server/auth';

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

  it('enables encrypted provider-token storage for Microsoft SSO', () => {
    const auth = createAuth({
      webUrl: 'https://studio.example.com',
      serverUrl: 'https://api.example.com',
      apiPath: '/api',
      authSecret: 'test-auth-secret',
      authMode: AuthMode.SSO_ONLY,
      db: {} as DatabaseInstance,
      microsoftSSO: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tenantId: 'tenant-id',
        roleGroups: {
          adminGroupIds: ['admin-group-id'],
          userGroupIds: ['user-group-id'],
        },
      },
    });

    expect(auth.options.account?.encryptOAuthTokens).toBe(true);
    expect(auth.options.databaseHooks?.account?.create?.before).toBeTypeOf(
      'function',
    );
    expect(auth.options.databaseHooks?.account?.update?.before).toBeTypeOf(
      'function',
    );
    expect(auth.options.databaseHooks?.session?.create?.before).toBeTypeOf(
      'function',
    );
  });
});
