import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStorageAccessProxy } from '../storage-access-proxy';

const SHARED_CONFIG = {
  enabled: true,
  signingSecret: 'x'.repeat(32),
  ttlSeconds: 900,
  serverUrl: 'https://api.example.com',
  storagePath: '/storage' as const,
  apiPath: '/api' as const,
};

const STORAGE_CONFIG = {
  provider: 's3' as const,
  bucket: 'content-studio',
  region: 'us-east-1',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  publicEndpoint: 'https://s3.us-east-1.amazonaws.com',
};

describe('storageAccessProxy', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rewrites storage keys to signed storage URLs', () => {
    const proxy = createStorageAccessProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    const rewritten = proxy.rewriteStorageLocation(
      'podcasts/pod_123/cover image.png',
    );

    expect(rewritten).toMatch(
      /^https:\/\/api\.example\.com\/storage\/podcasts\/pod_123\/cover%20image\.png\?token=/,
    );

    const token = new URL(rewritten!).searchParams.get('token');
    expect(token).toBeTruthy();
    expect(proxy.verifyToken(token!)).toEqual({
      key: 'podcasts/pod_123/cover image.png',
    });
  });

  it('rewrites nested storage fields in payloads', () => {
    const proxy = createStorageAccessProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    const payload = {
      persona: {
        id: 'persona_1',
        avatarStorageKey: 'personas/persona_1/avatar.png',
      },
      source: {
        contentKey: 'sources/source_1/content.txt',
      },
      job: {
        result: {
          imageUrl:
            'https://s3.us-east-1.amazonaws.com/content-studio/infographics/ig_1/latest.png',
          externalUrl: 'https://example.com/reference.png',
        },
      },
    };

    const rewritten = proxy.rewritePayloadStorageUrls(payload);

    expect(rewritten.persona.avatarStorageKey).toMatch(
      /^https:\/\/api\.example\.com\/storage\/personas\/persona_1\/avatar\.png\?token=/,
    );
    expect(rewritten.source.contentKey).toMatch(
      /^https:\/\/api\.example\.com\/storage\/sources\/source_1\/content\.txt\?token=/,
    );
    expect(rewritten.job.result.imageUrl).toMatch(
      /^https:\/\/api\.example\.com\/storage\/infographics\/ig_1\/latest\.png\?token=/,
    );
    expect(rewritten.job.result.externalUrl).toBe(
      'https://example.com/reference.png',
    );
  });

  it('expires tokens based on configured TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'));

    const proxy = createStorageAccessProxy({
      ...SHARED_CONFIG,
      ttlSeconds: 1,
      storageConfig: STORAGE_CONFIG,
    });

    const rewritten = proxy.rewriteStorageLocation(
      'infographics/ig_1/latest.png',
    )!;
    const token = new URL(rewritten).searchParams.get('token')!;

    expect(proxy.verifyToken(token)).toEqual({
      key: 'infographics/ig_1/latest.png',
    });

    vi.advanceTimersByTime(2000);
    expect(proxy.verifyToken(token)).toBeNull();
  });

  it('rejects tampered tokens', () => {
    const proxy = createStorageAccessProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    const rewritten = proxy.rewriteStorageLocation(
      'infographics/ig_1/latest.png',
    )!;
    const token = new URL(rewritten).searchParams.get('token')!;
    const [payload, signature] = token.split('.');
    const tampered = `${payload}.${signature}x`;

    expect(proxy.verifyToken(tampered)).toBeNull();
  });

  it('only rewrites API response paths', () => {
    const proxy = createStorageAccessProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    expect(proxy.shouldRewritePath('/api/podcasts')).toBe(true);
    expect(proxy.shouldRewritePath('/api/sources/source_1')).toBe(true);
    expect(proxy.shouldRewritePath('/healthcheck')).toBe(false);
    expect(proxy.shouldRewritePath('/storage/personas/p_1/avatar.png')).toBe(
      false,
    );
  });

  it('leaves unrecognized absolute URLs unchanged', () => {
    const proxy = createStorageAccessProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    const url = 'https://cdn.example.com/assets/avatar.png';
    expect(proxy.rewriteStorageLocation(url)).toBe(url);
  });
});
