import { describe, expect, it } from 'vitest';

import { buildComposeRuntimeEnv } from '../../scripts/compose-runtime-env.ts';

describe('buildComposeRuntimeEnv', () => {
  it('populates compose credentials with unprefixed env var names', () => {
    const env = buildComposeRuntimeEnv({});

    expect(env.SERVER_AUTH_SECRET).toBe('content_studio_compose_auth');
    expect(env.POSTGRES_USER).toBe('postgres');
    expect(env.POSTGRES_PASSWORD).toBe('postgres');
    expect(env.POSTGRES_DB).toBe('content_studio');
    expect(env.S3_ACCESS_KEY_ID).toBe('minioadmin');
    expect(env.S3_SECRET_ACCESS_KEY).toBe('minioadmin');
  });

  it('preserves explicit unprefixed compose credential values', () => {
    const env = buildComposeRuntimeEnv({
      POSTGRES_USER: 'studio',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_DB: 'studio_db',
      S3_ACCESS_KEY_ID: 'minio-user',
      S3_SECRET_ACCESS_KEY: 'minio-secret',
    });

    expect(env.POSTGRES_USER).toBe('studio');
    expect(env.POSTGRES_PASSWORD).toBe('secret');
    expect(env.POSTGRES_DB).toBe('studio_db');
    expect(env.S3_ACCESS_KEY_ID).toBe('minio-user');
    expect(env.S3_SECRET_ACCESS_KEY).toBe('minio-secret');
  });

  it('maps legacy prefixed compose credentials to the new env var names', () => {
    const env = buildComposeRuntimeEnv({
      CONTENT_STUDIO_POSTGRES_USER: 'legacy-user',
      CONTENT_STUDIO_POSTGRES_PASSWORD: 'legacy-password',
      CONTENT_STUDIO_POSTGRES_DB: 'legacy-db',
      CONTENT_STUDIO_S3_ACCESS_KEY_ID: 'legacy-minio-user',
      CONTENT_STUDIO_S3_SECRET_ACCESS_KEY: 'legacy-minio-secret',
    });

    expect(env.POSTGRES_USER).toBe('legacy-user');
    expect(env.POSTGRES_PASSWORD).toBe('legacy-password');
    expect(env.POSTGRES_DB).toBe('legacy-db');
    expect(env.S3_ACCESS_KEY_ID).toBe('legacy-minio-user');
    expect(env.S3_SECRET_ACCESS_KEY).toBe('legacy-minio-secret');
  });
});
