import { createHmac, timingSafeEqual } from 'node:crypto';
import type { StorageConfig } from '@repo/api/server';

interface AudioPlaybackTokenPayload {
  v: 1;
  key: string;
  exp: number;
}

export interface AudioPlaybackProxyConfig {
  signingSecret: string;
  ttlSeconds: number;
  serverUrl: string;
  apiPath: `/${string}`;
  storageConfig: StorageConfig;
}

export interface AudioPlaybackProxy {
  readonly shouldRewritePath: (requestPath: string) => boolean;
  readonly rewriteAudioUrl: (audioUrl: string | null) => string | null;
  readonly rewritePayloadAudioUrls: <T>(payload: T) => T;
  readonly verifyToken: (token: string) => { key: string } | null;
  readonly inferContentType: (key: string) => string;
}

const TOKEN_VERSION = 1 as const;
const AUDIO_PLAYBACK_ROUTE = '/audio/playback';

const asBase64Url = (value: string | Buffer): string =>
  Buffer.from(value).toString('base64url');

const signSegment = (segment: string, signingSecret: string): string =>
  createHmac('sha256', signingSecret).update(segment).digest('base64url');

const safeEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const ensureTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value : `${value}/`;

const normalizeStorageKey = (key: string): string | null => {
  const trimmed = key.trim().replace(/^\/+/, '');
  if (trimmed.length === 0) return null;
  if (trimmed.includes('\0') || trimmed.includes('\\')) return null;

  const segments = trimmed.split('/');
  if (
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    return null;
  }

  return trimmed;
};

const pathPrefix = (pathname: string): string =>
  pathname.endsWith('/') ? pathname : `${pathname}/`;

const parseStorageKeyFromS3Url = (
  audioUrl: URL,
  storageConfig: StorageConfig,
): string | null => {
  const endpoint =
    storageConfig.publicEndpoint ??
    storageConfig.endpoint ??
    `https://s3.${storageConfig.region}.amazonaws.com`;

  let base: URL;
  try {
    base = new URL(endpoint);
  } catch {
    return null;
  }

  if (audioUrl.origin !== base.origin) return null;

  const bucketPrefix = `${pathPrefix(base.pathname)}${storageConfig.bucket}/`;
  if (!audioUrl.pathname.startsWith(bucketPrefix)) return null;

  const encodedKey = audioUrl.pathname.slice(bucketPrefix.length);
  try {
    return normalizeStorageKey(decodeURIComponent(encodedKey));
  } catch {
    return null;
  }
};

const parseStorageKey = (
  audioUrl: string,
  storageConfig: StorageConfig,
): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(audioUrl);
  } catch {
    return normalizeStorageKey(audioUrl);
  }

  return parseStorageKeyFromS3Url(parsed, storageConfig);
};

const AUDIO_URL_FIELDS = new Set(['audioUrl', 'previewUrl']);

const buildAudioPlaybackUrl = (
  serverUrl: string,
  apiPath: `/${string}`,
  token: string,
): string => {
  const base = new URL(ensureTrailingSlash(serverUrl));
  const cleanApiPath = apiPath.endsWith('/') ? apiPath.slice(0, -1) : apiPath;
  base.pathname = `${cleanApiPath}${AUDIO_PLAYBACK_ROUTE}`;
  base.search = '';
  base.searchParams.set('token', token);
  return base.toString();
};

const createAudioToken = (
  key: string,
  signingSecret: string,
  ttlSeconds: number,
): string => {
  const payload: AudioPlaybackTokenPayload = {
    v: TOKEN_VERSION,
    key,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadSegment = asBase64Url(JSON.stringify(payload));
  const signature = signSegment(payloadSegment, signingSecret);
  return `${payloadSegment}.${signature}`;
};

const verifyAudioToken = (
  token: string,
  signingSecret: string,
): { key: string } | null => {
  const [payloadSegment, signature] = token.split('.');
  if (!payloadSegment || !signature) return null;

  const expectedSignature = signSegment(payloadSegment, signingSecret);
  if (!safeEquals(signature, expectedSignature)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8'),
    );
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<AudioPlaybackTokenPayload>;
  if (candidate.v !== TOKEN_VERSION) return null;
  if (typeof candidate.exp !== 'number') return null;
  if (candidate.exp < Math.floor(Date.now() / 1000)) return null;
  if (typeof candidate.key !== 'string') return null;

  const key = normalizeStorageKey(candidate.key);
  if (!key) return null;

  return { key };
};

const rewritePayloadAudioUrls = (
  value: unknown,
  rewriteAudioUrl: (audioUrl: string | null) => string | null,
): unknown => {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const rewritten = rewritePayloadAudioUrls(item, rewriteAudioUrl);
      if (rewritten !== item) changed = true;
      return rewritten;
    });
    return changed ? next : value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  let changed = false;
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(record)) {
    if (AUDIO_URL_FIELDS.has(key)) {
      if (typeof item === 'string' || item === null) {
        const rewritten = rewriteAudioUrl(item);
        next[key] = rewritten;
        if (rewritten !== item) changed = true;
      } else {
        next[key] = item;
      }
      continue;
    }

    const rewritten = rewritePayloadAudioUrls(item, rewriteAudioUrl);
    next[key] = rewritten;
    if (rewritten !== item) changed = true;
  }

  return changed ? next : value;
};

const inferAudioContentType = (key: string): string => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.endsWith('.wav')) return 'audio/wav';
  if (lowerKey.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerKey.endsWith('.m4a')) return 'audio/mp4';
  if (lowerKey.endsWith('.aac')) return 'audio/aac';
  if (lowerKey.endsWith('.ogg')) return 'audio/ogg';
  if (lowerKey.endsWith('.webm')) return 'audio/webm';
  return 'application/octet-stream';
};

export const createAudioPlaybackProxy = (
  config: AudioPlaybackProxyConfig,
): AudioPlaybackProxy => {
  const cleanApiPath = config.apiPath.endsWith('/')
    ? config.apiPath.slice(0, -1)
    : config.apiPath;

  const shouldRewritePath = (requestPath: string): boolean => {
    const pathOnly = requestPath.split('?')[0] ?? requestPath;
    return (
      pathOnly.startsWith(`${cleanApiPath}/podcasts`) ||
      pathOnly.startsWith(`${cleanApiPath}/voiceovers`) ||
      pathOnly.startsWith(`${cleanApiPath}/voices`)
    );
  };

  const rewriteAudioUrl = (audioUrl: string | null): string | null => {
    if (audioUrl === null) return audioUrl;

    const key = parseStorageKey(audioUrl, config.storageConfig);
    if (!key) return audioUrl;

    const token = createAudioToken(
      key,
      config.signingSecret,
      config.ttlSeconds,
    );
    return buildAudioPlaybackUrl(config.serverUrl, config.apiPath, token);
  };

  return {
    shouldRewritePath,
    rewriteAudioUrl,
    rewritePayloadAudioUrls: <T>(payload: T): T =>
      rewritePayloadAudioUrls(payload, rewriteAudioUrl) as T,
    verifyToken: (token: string) =>
      verifyAudioToken(token, config.signingSecret),
    inferContentType: inferAudioContentType,
  };
};
