import { Storage } from '@repo/storage';
import { Cause, Effect, Option } from 'effect';
import { Hono } from 'hono';
import { serverRuntime, storageAccessProxy } from '../services';

export const staticRoute = new Hono();

const STORAGE_ROUTE_PREFIX = '/storage/';

const normalizeStorageKey = (requestPath: string): string | null => {
  if (!requestPath.startsWith(STORAGE_ROUTE_PREFIX)) return null;

  const encodedKey = requestPath.slice(STORAGE_ROUTE_PREFIX.length);
  if (!encodedKey) return null;

  try {
    const key = decodeURIComponent(encodedKey).trim().replace(/^\/+/, '');
    if (key.length === 0) return null;
    if (key.includes('\0') || key.includes('\\')) return null;

    const segments = key.split('/');
    if (
      segments.some(
        (segment) =>
          segment.length === 0 || segment === '.' || segment === '..',
      )
    ) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
};

const inferContentType = (key: string): string => {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
};

staticRoute.get('/*', async (c) => {
  const key = normalizeStorageKey(c.req.path);
  if (!key) {
    return c.text('Not Found', 404);
  }

  if (storageAccessProxy.enabled) {
    const token = c.req.query('token');
    if (!token) {
      return c.text('Not Found', 404);
    }

    const verified = storageAccessProxy.verifyToken(token);
    if (!verified || verified.key !== key) {
      return c.text('Not Found', 404);
    }
  }

  const exit = await serverRuntime.runPromiseExit(
    Effect.gen(function* () {
      const storage = yield* Storage;
      return yield* storage.download(key);
    }),
  );

  if (exit._tag === 'Failure') {
    const failure = Option.getOrUndefined(Cause.failureOption(exit.cause));
    if (
      failure &&
      typeof failure === 'object' &&
      '_tag' in failure &&
      failure._tag === 'StorageError'
    ) {
      return c.text('Storage unavailable', 503);
    }
    return c.text('Not Found', 404);
  }

  const data = exit.value;
  c.header('Content-Type', inferContentType(key));
  c.header(
    'Cache-Control',
    storageAccessProxy.enabled ? 'private, max-age=60' : 'public, max-age=300',
  );
  c.header('Content-Length', String(data.length));
  return c.body(new Uint8Array(data));
});

export const staticPath = '/storage';
