import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as EnvModule from '../env';

const originalEnv = { ...process.env };

const loadEnvModule = async (overrides: Record<string, string | undefined>) => {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    SERVER_AUTH_SECRET: 'x'.repeat(32),
    SERVER_POSTGRES_URL: 'postgres://postgres:postgres@localhost:5432/postgres',
    PUBLIC_SERVER_URL: 'https://api.example.com',
    PUBLIC_WEB_URL: 'https://studio.example.com',
    NODE_ENV: 'production',
    TRUST_PROXY: 'true',
    USE_MOCK_AI: 'true',
    AUTH_MODE: 'sso-only',
    AUTH_MICROSOFT_CLIENT_ID: 'client-id',
    AUTH_MICROSOFT_CLIENT_SECRET: 'client-secret',
    AUTH_MICROSOFT_TENANT_ID: 'tenant-id',
    AUTH_ROLE_ADMIN_GROUP_IDS: 'admin-group',
    AUTH_ROLE_USER_GROUP_IDS: 'user-group',
    AUDIO_PLAYBACK_SIGNING_SECRET: 'y'.repeat(32),
    ...overrides,
  };

  return vi.importActual<typeof EnvModule>('../env');
};

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('server env', () => {
  it('rejects hybrid auth mode', async () => {
    await expect(loadEnvModule({ AUTH_MODE: 'hybrid' })).rejects.toThrow();
  });

  it('requires a signing secret when storage proxy protection is enabled', async () => {
    await expect(
      loadEnvModule({
        AUDIO_PLAYBACK_PROXY_ENABLED: 'false',
        STORAGE_ACCESS_PROXY_ENABLED: 'true',
        AUDIO_PLAYBACK_SIGNING_SECRET: '',
      }),
    ).rejects.toThrow(
      'AUDIO_PLAYBACK_SIGNING_SECRET is required in production when AUDIO_PLAYBACK_PROXY_ENABLED=true or STORAGE_ACCESS_PROXY_ENABLED=true',
    );
  });

  it('parses DISABLE_DEEP_RESEARCH as a boolean flag', async () => {
    const { env } = await loadEnvModule({
      DISABLE_DEEP_RESEARCH: 'true',
    });

    expect(env.DISABLE_DEEP_RESEARCH).toBe(true);
  });
});
