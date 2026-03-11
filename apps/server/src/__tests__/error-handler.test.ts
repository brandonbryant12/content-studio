import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { globalErrorHandler } from '../error-handler';
import { requestIdMiddleware } from '../middleware/request-id';

describe('globalErrorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves HTTPException response status, headers, and body', async () => {
    const app = new Hono<{ Variables: { requestId: string } }>();
    app.use(requestIdMiddleware);
    app.onError(globalErrorHandler);
    app.get('/auth', () => {
      throw new HTTPException(401, {
        res: new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="content-studio"',
            'X-Debug-Source': 'framework',
          },
        }),
      });
    });

    const res = await app.request('/auth', {
      headers: { 'x-request-id': 'req-http-exception' },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe(
      'Bearer realm="content-studio"',
    );
    expect(res.headers.get('X-Debug-Source')).toBe('framework');
    expect(res.headers.get('X-Request-Id')).toBe('req-http-exception');
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns problem details for non-HTTPException errors', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const app = new Hono<{ Variables: { requestId: string } }>();
    app.use(requestIdMiddleware);
    app.onError(globalErrorHandler);
    app.get('/boom', () => {
      throw new Error('unexpected');
    });

    const res = await app.request('/boom', {
      headers: { 'x-request-id': 'req-internal-error' },
    });

    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
    expect(res.headers.get('X-Request-Id')).toBe('req-internal-error');
    await expect(res.json()).resolves.toEqual({
      type: 'https://content-studio.dev/problems/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An internal error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
      requestId: 'req-internal-error',
    });
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '\t[ERROR]',
      expect.stringContaining('unexpected'),
    );
  });
});
