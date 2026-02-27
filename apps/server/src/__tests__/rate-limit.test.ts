import { Hono } from 'hono';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimiter } from '../middleware/rate-limit';

describe('rateLimiter middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
  });

  it('allows requests within the limit', async () => {
    app.use(rateLimiter({ limit: 3, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/');

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('2');
  });

  it('returns 429 when limit is exceeded', async () => {
    app.use(rateLimiter({ limit: 2, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const makeReq = () => app.request('/');

    await makeReq();
    await makeReq();
    const res = await makeReq();

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('tracks clients independently with custom key generator', async () => {
    app.use(
      rateLimiter({
        limit: 1,
        windowMs: 60_000,
        keyGenerator: (c) => c.req.header('x-client-id') ?? 'anonymous',
      }),
    );
    app.get('/', (c) => c.text('ok'));

    const res1 = await app.request('/', {
      headers: { 'x-client-id': 'client-a' },
    });
    const res2 = await app.request('/', {
      headers: { 'x-client-id': 'client-b' },
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it('resets after the window expires', async () => {
    app.use(rateLimiter({ limit: 1, windowMs: 50 }));
    app.get('/', (c) => c.text('ok'));

    const makeReq = () => app.request('/');

    await makeReq();
    const blocked = await makeReq();
    expect(blocked.status).toBe(429);

    await new Promise((r) => setTimeout(r, 100));

    const afterReset = await makeReq();
    expect(afterReset.status).toBe(200);
  });

  it('sets correct rate limit headers', async () => {
    app.use(rateLimiter({ limit: 5, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/');

    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('ignores spoofed proxy headers when trustProxyHeaders is disabled', async () => {
    app.use(
      rateLimiter({ limit: 1, windowMs: 60_000, trustProxyHeaders: false }),
    );
    app.get('/', (c) => c.text('ok'));

    const res1 = await app.request('/', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    const res2 = await app.request('/', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(429);
  });

  it('uses forwarded headers only when trustProxyHeaders is enabled', async () => {
    app.use(
      rateLimiter({ limit: 1, windowMs: 60_000, trustProxyHeaders: true }),
    );
    app.get('/', (c) => c.text('ok'));

    const res1 = await app.request('/', {
      headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
    });
    const res2 = await app.request('/', {
      headers: { 'x-forwarded-for': '1.1.1.1, 9.9.9.9' },
    });
    const res3 = await app.request('/', {
      headers: { 'x-forwarded-for': '8.8.8.8' },
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(429);
    expect(res3.status).toBe(200);
  });

  it('falls back to x-real-ip when x-forwarded-for is absent in trust mode', async () => {
    app.use(
      rateLimiter({ limit: 1, windowMs: 60_000, trustProxyHeaders: true }),
    );
    app.get('/', (c) => c.text('ok'));

    const res1 = await app.request('/', {
      headers: { 'x-real-ip': '5.5.5.5' },
    });
    const res2 = await app.request('/', {
      headers: { 'x-real-ip': '5.5.5.5' },
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(429);
  });

  it('uses "unknown" when no trusted identity source is available', async () => {
    app.use(
      rateLimiter({ limit: 1, windowMs: 60_000, trustProxyHeaders: false }),
    );
    app.get('/', (c) => c.text('ok'));

    const res1 = await app.request('/');
    const res2 = await app.request('/');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(429);
  });

  it('decrements remaining count on each request', async () => {
    app.use(rateLimiter({ limit: 3, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const res1 = await app.request('/');
    const res2 = await app.request('/');
    const res3 = await app.request('/');

    expect(res1.headers.get('X-RateLimit-Remaining')).toBe('2');
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('1');
    expect(res3.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('supports async custom store adapters', async () => {
    const consume = vi.fn(async () => ({
      count: 4,
      resetAt: Date.now() + 60_000,
    }));

    app.use(
      rateLimiter({
        limit: 3,
        windowMs: 60_000,
        store: { consume },
      }),
    );
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/');

    expect(res.status).toBe(429);
    expect(consume).toHaveBeenCalledOnce();
  });
});
