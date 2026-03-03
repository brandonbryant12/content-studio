import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAudioPlaybackProxy } from '../audio-playback-proxy';

const SHARED_CONFIG = {
  enabled: true,
  signingSecret: 'x'.repeat(32),
  ttlSeconds: 900,
  serverUrl: 'https://api.example.com',
  apiPath: '/api' as const,
};

describe('audioPlaybackProxy', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rewrites filesystem audio URLs to signed playback URLs', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: {
        provider: 'filesystem',
        basePath: '/tmp/uploads',
        baseUrl: 'https://api.example.com/storage',
      },
    });

    const rewritten = proxy.rewriteAudioUrl(
      'https://api.example.com/storage/podcasts/pod_123/audio-1.wav',
    );

    expect(rewritten).toMatch(
      /^https:\/\/api\.example\.com\/api\/audio\/playback\?token=/,
    );

    const token = new URL(rewritten!).searchParams.get('token');
    expect(token).toBeTruthy();
    expect(proxy.verifyToken(token!)).toEqual({
      key: 'podcasts/pod_123/audio-1.wav',
    });
  });

  it('rewrites s3 audio URLs to signed playback URLs', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: {
        provider: 's3',
        bucket: 'cs-audio',
        region: 'us-east-1',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        publicEndpoint: 'https://s3.us-east-1.amazonaws.com',
      },
    });

    const rewritten = proxy.rewriteAudioUrl(
      'https://s3.us-east-1.amazonaws.com/cs-audio/voiceovers/vo_321/audio.wav',
    );

    expect(rewritten).toMatch(
      /^https:\/\/api\.example\.com\/api\/audio\/playback\?token=/,
    );

    const token = new URL(rewritten!).searchParams.get('token');
    expect(proxy.verifyToken(token!)).toEqual({
      key: 'voiceovers/vo_321/audio.wav',
    });
  });

  it('keeps unrecognized audio URLs unchanged', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: {
        provider: 'filesystem',
        basePath: '/tmp/uploads',
        baseUrl: 'https://api.example.com/storage',
      },
    });

    const url = 'https://cdn.example.com/audio/final.wav';
    expect(proxy.rewriteAudioUrl(url)).toBe(url);
  });

  it('rewrites nested audioUrl fields in JSON payloads', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: {
        provider: 'filesystem',
        basePath: '/tmp/uploads',
        baseUrl: 'https://api.example.com/storage',
      },
    });

    const payload = {
      podcast: {
        id: 'pod_1',
        audioUrl: 'https://api.example.com/storage/podcasts/pod_1/audio.wav',
      },
      items: [
        {
          id: 'vo_1',
          audioUrl:
            'https://api.example.com/storage/voiceovers/vo_1/audio.wav',
        },
      ],
    };

    const rewritten = proxy.rewritePayloadAudioUrls(payload);
    expect(rewritten.podcast.audioUrl).toMatch(
      /^https:\/\/api\.example\.com\/api\/audio\/playback\?token=/,
    );
    expect(rewritten.items[0]?.audioUrl).toMatch(
      /^https:\/\/api\.example\.com\/api\/audio\/playback\?token=/,
    );
  });

  it('expires tokens based on configured TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'));

    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      ttlSeconds: 1,
      storageConfig: {
        provider: 'filesystem',
        basePath: '/tmp/uploads',
        baseUrl: 'https://api.example.com/storage',
      },
    });

    const rewritten = proxy.rewriteAudioUrl(
      'https://api.example.com/storage/podcasts/pod_1/audio.wav',
    )!;
    const token = new URL(rewritten).searchParams.get('token')!;

    expect(proxy.verifyToken(token)).toEqual({
      key: 'podcasts/pod_1/audio.wav',
    });

    vi.advanceTimersByTime(2000);
    expect(proxy.verifyToken(token)).toBeNull();
  });

  it('rejects tampered tokens', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: {
        provider: 'filesystem',
        basePath: '/tmp/uploads',
        baseUrl: 'https://api.example.com/storage',
      },
    });

    const rewritten = proxy.rewriteAudioUrl(
      'https://api.example.com/storage/podcasts/pod_1/audio.wav',
    )!;
    const token = new URL(rewritten).searchParams.get('token')!;
    const [payload, signature] = token.split('.');
    const tampered = `${payload}.${signature}x`;

    expect(proxy.verifyToken(tampered)).toBeNull();
  });

  it('does not sign unsafe relative storage keys', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: {
        provider: 'filesystem',
        basePath: '/tmp/uploads',
        baseUrl: 'https://api.example.com/storage',
      },
    });

    expect(proxy.rewriteAudioUrl('../secrets/audio.wav')).toBe(
      '../secrets/audio.wav',
    );
  });

  it('only rewrites podcast/voiceover API response paths', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: {
        provider: 'filesystem',
        basePath: '/tmp/uploads',
        baseUrl: 'https://api.example.com/storage',
      },
    });

    expect(proxy.shouldRewritePath('/api/podcasts')).toBe(true);
    expect(proxy.shouldRewritePath('/api/podcasts/pod_1')).toBe(true);
    expect(proxy.shouldRewritePath('/api/voiceovers')).toBe(true);
    expect(proxy.shouldRewritePath('/api/voiceovers/vo_1')).toBe(true);
    expect(proxy.shouldRewritePath('/api/documents')).toBe(false);
    expect(proxy.shouldRewritePath('/api/audio/playback')).toBe(false);
  });
});
