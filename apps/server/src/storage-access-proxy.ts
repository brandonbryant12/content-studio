import { createHmac, timingSafeEqual } from 'node:crypto';
import type { StorageConfig } from '@repo/api/server';

interface StorageAccessTokenPayload {
  v: 1;
  key: string;
  exp: number;
}

export interface StorageAccessProxyConfig {
  enabled: boolean;
  signingSecret: string;
  ttlSeconds: number;
  serverUrl: string;
  storagePath: `/${string}`;
  apiPath: `/${string}`;
  storageConfig: StorageConfig;
}

export interface StorageAccessProxy {
  readonly enabled: boolean;
  readonly shouldRewritePath: (requestPath: string) => boolean;
  readonly rewriteStorageLocation: (
    storageLocation: string | null,
  ) => string | null;
  readonly rewritePayloadStorageUrls: <T>(payload: T) => T;
  readonly verifyToken: (token: string) => { key: string } | null;
}

const TOKEN_VERSION = 1 as const;
const STORAGE_PROXY_PATH_PREFIXES = [
  '/podcasts',
  '/personas',
  '/infographics',
  '/sources',
] as const;
const TRUSTED_STORAGE_KEY_FIELDS = new Set([
  'avatarStorageKey',
  'coverImageStorageKey',
  'imageStorageKey',
  'thumbnailStorageKey',
]);
const SKIPPED_TRAVERSAL_FIELDS = new Set(['metadata']);

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

const normalizeRoutePath = (value: `/${string}`): `/${string}` => {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  const withoutTrailingSlash =
    withLeadingSlash.endsWith('/') && withLeadingSlash.length > 1
      ? withLeadingSlash.slice(0, -1)
      : withLeadingSlash;
  return withoutTrailingSlash as `/${string}`;
};

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

const encodeStorageKeyForPath = (key: string): string =>
  key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const parseStorageKeyFromS3Url = (
  storageUrl: URL,
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

  if (storageUrl.origin !== base.origin) return null;

  const bucketPrefix = `${pathPrefix(base.pathname)}${storageConfig.bucket}/`;
  if (!storageUrl.pathname.startsWith(bucketPrefix)) return null;

  const encodedKey = storageUrl.pathname.slice(bucketPrefix.length);
  try {
    return normalizeStorageKey(decodeURIComponent(encodedKey));
  } catch {
    return null;
  }
};

const parseStorageKeyFromStorageUrl = (
  storageUrl: URL,
  serverUrl: string,
  storagePath: `/${string}`,
): string | null => {
  let server: URL;
  try {
    server = new URL(serverUrl);
  } catch {
    return null;
  }

  if (storageUrl.origin !== server.origin) return null;

  const cleanStoragePath = normalizeRoutePath(storagePath);
  const serverBasePath =
    server.pathname === '/' ? '' : server.pathname.replace(/\/+$/, '');
  const routePrefix = `${serverBasePath}${cleanStoragePath}/`;
  if (!storageUrl.pathname.startsWith(routePrefix)) return null;

  const encodedKey = storageUrl.pathname.slice(routePrefix.length);
  try {
    return normalizeStorageKey(decodeURIComponent(encodedKey));
  } catch {
    return null;
  }
};

const parseStorageKey = (
  storageLocation: string,
  config: StorageAccessProxyConfig,
): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(storageLocation);
  } catch {
    return normalizeStorageKey(storageLocation);
  }

  return (
    parseStorageKeyFromStorageUrl(
      parsed,
      config.serverUrl,
      normalizeRoutePath(config.storagePath),
    ) ?? parseStorageKeyFromS3Url(parsed, config.storageConfig)
  );
};

const isSourceRecord = (record: Record<string, unknown>): boolean =>
  typeof record.contentKey === 'string' &&
  typeof record.mimeType === 'string' &&
  typeof record.wordCount === 'number' &&
  typeof record.source === 'string' &&
  typeof record.status === 'string';

const shouldRewriteStorageField = (
  record: Record<string, unknown>,
  fieldName: string,
): boolean => {
  if (TRUSTED_STORAGE_KEY_FIELDS.has(fieldName)) {
    return true;
  }

  return fieldName === 'contentKey' && isSourceRecord(record);
};

const buildStorageAccessUrl = (
  serverUrl: string,
  storagePath: `/${string}`,
  key: string,
  token: string,
): string => {
  const base = new URL(ensureTrailingSlash(serverUrl));
  const cleanStoragePath = normalizeRoutePath(storagePath);
  const serverBasePath =
    base.pathname === '/' ? '' : base.pathname.replace(/\/+$/, '');
  base.pathname = `${serverBasePath}${cleanStoragePath}/${encodeStorageKeyForPath(key)}`;
  base.search = '';
  base.searchParams.set('token', token);
  return base.toString();
};

const createStorageToken = (
  key: string,
  signingSecret: string,
  ttlSeconds: number,
): string => {
  const payload: StorageAccessTokenPayload = {
    v: TOKEN_VERSION,
    key,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadSegment = asBase64Url(JSON.stringify(payload));
  const signature = signSegment(payloadSegment, signingSecret);
  return `${payloadSegment}.${signature}`;
};

const verifyStorageToken = (
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
  const candidate = payload as Partial<StorageAccessTokenPayload>;
  if (candidate.v !== TOKEN_VERSION) return null;
  if (typeof candidate.exp !== 'number') return null;
  if (candidate.exp < Math.floor(Date.now() / 1000)) return null;
  if (typeof candidate.key !== 'string') return null;

  const key = normalizeStorageKey(candidate.key);
  if (!key) return null;

  return { key };
};

const rewritePayloadStorageUrls = (
  value: unknown,
  rewriteStorageLocation: (storageLocation: string | null) => string | null,
): unknown => {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const rewritten = rewritePayloadStorageUrls(item, rewriteStorageLocation);
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
    if (shouldRewriteStorageField(record, key)) {
      if (typeof item === 'string' || item === null) {
        const rewritten = rewriteStorageLocation(item);
        next[key] = rewritten;
        if (rewritten !== item) changed = true;
      } else {
        next[key] = item;
      }
      continue;
    }

    if (SKIPPED_TRAVERSAL_FIELDS.has(key)) {
      next[key] = item;
      continue;
    }

    const rewritten = rewritePayloadStorageUrls(item, rewriteStorageLocation);
    next[key] = rewritten;
    if (rewritten !== item) changed = true;
  }

  return changed ? next : value;
};

export const createStorageAccessProxy = (
  config: StorageAccessProxyConfig,
): StorageAccessProxy => {
  const cleanApiPath = normalizeRoutePath(config.apiPath);

  const shouldRewritePath = (requestPath: string): boolean => {
    const pathOnly = requestPath.split('?')[0] ?? requestPath;
    return STORAGE_PROXY_PATH_PREFIXES.some(
      (prefix) =>
        pathOnly === `${cleanApiPath}${prefix}` ||
        pathOnly.startsWith(`${cleanApiPath}${prefix}/`),
    );
  };

  const rewriteStorageLocation = (
    storageLocation: string | null,
  ): string | null => {
    if (!config.enabled || storageLocation === null) return storageLocation;

    const key = parseStorageKey(storageLocation, config);
    if (!key) return storageLocation;

    const token = createStorageToken(
      key,
      config.signingSecret,
      config.ttlSeconds,
    );
    return buildStorageAccessUrl(
      config.serverUrl,
      config.storagePath,
      key,
      token,
    );
  };

  return {
    enabled: config.enabled,
    shouldRewritePath,
    rewriteStorageLocation,
    rewritePayloadStorageUrls: <T>(payload: T): T =>
      rewritePayloadStorageUrls(payload, rewriteStorageLocation) as T,
    verifyToken: (token: string) =>
      verifyStorageToken(token, config.signingSecret),
  };
};
