import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAudioPlaybackProxy } from '../audio-playback-proxy';

const SHARED_CONFIG = {
  signingSecret: 'x'.repeat(32),
  ttlSeconds: 900,
  serverUrl: 'https://api.example.com',
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

describe('audioPlaybackProxy', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rewrites s3 audio URLs to signed playback URLs', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    const rewritten = proxy.rewriteAudioUrl(
      'https://s3.us-east-1.amazonaws.com/content-studio/podcasts/pod_123/audio-1.wav',
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

  it('keeps unrecognized audio URLs unchanged', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    const url = 'https://cdn.example.com/audio/final.wav';
    expect(proxy.rewriteAudioUrl(url)).toBe(url);
  });

  it('rewrites nested audioUrl and previewUrl fields in JSON payloads', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    const payload = {
      podcast: {
        id: 'pod_1',
        audioUrl:
          'https://s3.us-east-1.amazonaws.com/content-studio/podcasts/pod_1/audio.wav',
      },
      voices: [
        {
          id: 'voice_1',
          previewUrl:
            'https://s3.us-east-1.amazonaws.com/content-studio/voice-previews/voice_1.wav',
        },
      ],
      items: [
        {
          id: 'vo_1',
          audioUrl:
            'https://s3.us-east-1.amazonaws.com/content-studio/voiceovers/vo_1/audio.wav',
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
    expect(rewritten.voices[0]?.previewUrl).toMatch(
      /^https:\/\/api\.example\.com\/api\/audio\/playback\?token=/,
    );
  });

  it('expires tokens based on configured TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'));

    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      ttlSeconds: 1,
      storageConfig: STORAGE_CONFIG,
    });

    const rewritten = proxy.rewriteAudioUrl(
      'https://s3.us-east-1.amazonaws.com/content-studio/podcasts/pod_1/audio.wav',
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
      storageConfig: STORAGE_CONFIG,
    });

    const rewritten = proxy.rewriteAudioUrl(
      'https://s3.us-east-1.amazonaws.com/content-studio/podcasts/pod_1/audio.wav',
    )!;
    const token = new URL(rewritten).searchParams.get('token')!;
    const [payload, signature] = token.split('.');
    const tampered = `${payload}.${signature}x`;

    expect(proxy.verifyToken(tampered)).toBeNull();
  });

  it('does not sign unsafe relative storage keys', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    expect(proxy.rewriteAudioUrl('../secrets/audio.wav')).toBe(
      '../secrets/audio.wav',
    );
  });

  it('only rewrites podcast, voiceover, and voices API response paths', () => {
    const proxy = createAudioPlaybackProxy({
      ...SHARED_CONFIG,
      storageConfig: STORAGE_CONFIG,
    });

    expect(proxy.shouldRewritePath('/api/podcasts')).toBe(true);
    expect(proxy.shouldRewritePath('/api/podcasts/pod_1')).toBe(true);
    expect(proxy.shouldRewritePath('/api/voiceovers')).toBe(true);
    expect(proxy.shouldRewritePath('/api/voiceovers/vo_1')).toBe(true);
    expect(proxy.shouldRewritePath('/api/voices')).toBe(true);
    expect(proxy.shouldRewritePath('/api/voices/list')).toBe(true);
    expect(proxy.shouldRewritePath('/api/sources')).toBe(false);
    expect(proxy.shouldRewritePath('/api/audio/playback')).toBe(false);
  });
});
