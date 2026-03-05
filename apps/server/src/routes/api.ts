import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bearerCorsPolicy } from '../config';
import { env } from '../env';
import { createApiRateLimit } from '../middleware/rate-limit';
import {
  api,
  audioPlaybackProxy,
  serverRuntime,
  storageAccessProxy,
} from '../services';
import { apiBodyLimit } from './api-body-limit';

const apiRateLimit = createApiRateLimit({
  redisUrl: env.SERVER_REDIS_URL,
  trustProxyHeaders: env.TRUST_PROXY,
});

interface ByteRange {
  start: number;
  end: number;
}

const parseByteRange = (
  headerValue: string,
  totalBytes: number,
): ByteRange | 'unsatisfiable' | null => {
  if (totalBytes <= 0) return 'unsatisfiable';

  const match = /^bytes=(\d*)-(\d*)$/.exec(headerValue.trim());
  if (!match) return null;

  const startRaw = match[1] ?? '';
  const endRaw = match[2] ?? '';

  if (!startRaw && !endRaw) return 'unsatisfiable';

  if (!startRaw) {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return 'unsatisfiable';
    }
    if (suffixLength >= totalBytes) {
      return { start: 0, end: totalBytes - 1 };
    }
    return { start: totalBytes - suffixLength, end: totalBytes - 1 };
  }

  const start = Number.parseInt(startRaw, 10);
  const endCandidate = endRaw ? Number.parseInt(endRaw, 10) : totalBytes - 1;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(endCandidate) ||
    start < 0 ||
    endCandidate < start
  ) {
    return 'unsatisfiable';
  }

  if (start >= totalBytes) {
    return 'unsatisfiable';
  }

  return {
    start,
    end: Math.min(endCandidate, totalBytes - 1),
  };
};

const createResponseWithBody = (response: Response, body: string): Response => {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const rewritePayloadUrlsInResponse = async (
  requestPath: string,
  response: Response,
): Promise<Response> => {
  const shouldRewriteAudio =
    audioPlaybackProxy.enabled &&
    audioPlaybackProxy.shouldRewritePath(requestPath);
  const shouldRewriteStorage =
    storageAccessProxy.enabled &&
    storageAccessProxy.shouldRewritePath(requestPath);
  if (!shouldRewriteAudio && !shouldRewriteStorage) return response;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response;

  const body = await response.text();
  if (body.length === 0) {
    return createResponseWithBody(response, body);
  }

  try {
    let payload = JSON.parse(body) as unknown;
    if (shouldRewriteAudio) {
      payload = audioPlaybackProxy.rewritePayloadAudioUrls(payload);
    }
    if (shouldRewriteStorage) {
      payload = storageAccessProxy.rewritePayloadStorageUrls(payload);
    }
    return createResponseWithBody(response, JSON.stringify(payload));
  } catch {
    return createResponseWithBody(response, body);
  }
};

export const apiRoute = new Hono<{ Variables: { requestId: string } }>()
  .use(
    cors({
      ...bearerCorsPolicy,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  )
  .use(apiRateLimit)
  .use(apiBodyLimit)
  .get('/audio/playback', async (c) => {
    if (!audioPlaybackProxy.enabled) {
      return c.text('Not Found', 404);
    }

    const token = c.req.query('token');
    if (!token) {
      return c.text('Not Found', 404);
    }

    const verified = audioPlaybackProxy.verifyToken(token);
    if (!verified) {
      return c.text('Not Found', 404);
    }

    const exit = await serverRuntime.runPromiseExit(
      Effect.gen(function* () {
        const storage = yield* Storage;
        return yield* storage.download(verified.key);
      }),
    );

    if (exit._tag === 'Failure') {
      return c.text('Not Found', 404);
    }

    const data = exit.value;
    const totalBytes = data.length;

    c.header('Content-Type', audioPlaybackProxy.inferContentType(verified.key));
    c.header('Accept-Ranges', 'bytes');
    c.header('Cache-Control', 'private, max-age=60');

    const rangeHeader = c.req.header('range');
    if (!rangeHeader) {
      c.header('Content-Length', String(totalBytes));
      return c.body(new Uint8Array(data));
    }

    const range = parseByteRange(rangeHeader, totalBytes);
    if (range === 'unsatisfiable') {
      c.header('Content-Range', `bytes */${totalBytes}`);
      return c.body('', 416);
    }

    if (!range) {
      c.header('Content-Length', String(totalBytes));
      return c.body(new Uint8Array(data));
    }

    const chunk = data.subarray(range.start, range.end + 1);
    c.header('Content-Length', String(chunk.length));
    c.header(
      'Content-Range',
      `bytes ${range.start}-${range.end}/${totalBytes}`,
    );
    return c.body(new Uint8Array(chunk), 206);
  })
  .all('/*', async (c, next) => {
    const { matched, response } = await api.handler(
      c.req.raw,
      c.get('requestId'),
    );
    if (matched) {
      const rewrittenResponse = await rewritePayloadUrlsInResponse(
        c.req.path,
        response,
      );
      return c.newResponse(rewrittenResponse.body, rewrittenResponse);
    }
    await next();
  });

export const apiPath = `${env.PUBLIC_SERVER_API_PATH}`;
