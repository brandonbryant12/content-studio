import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimiter } from '../middleware/rate-limit';

describe('rateLimiter middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
  });

  it('allows requests within the limit', async () => {
    app.use(rateLimiter({ limit: 3, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('2');
  });

  it('returns 429 when limit is exceeded', async () => {
    app.use(rateLimiter({ limit: 2, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const makeReq = () =>
      app.request('/', { headers: { 'x-forwarded-for': '1.2.3.4' } });

    await makeReq(); // 1
    await makeReq(); // 2 (at limit)
    const res = await makeReq(); // 3 (over limit)

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('tracks clients independently by IP', async () => {
    app.use(rateLimiter({ limit: 1, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const res1 = await app.request('/', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    const res2 = await app.request('/', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it('resets after the window expires', async () => {
    app.use(rateLimiter({ limit: 1, windowMs: 50 }));
    app.get('/', (c) => c.text('ok'));

    const makeReq = () =>
      app.request('/', { headers: { 'x-forwarded-for': '1.2.3.4' } });

    await makeReq(); // 1 (at limit)
    const blocked = await makeReq(); // 2 (over limit)
    expect(blocked.status).toBe(429);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 100));

    const afterReset = await makeReq();
    expect(afterReset.status).toBe(200);
  });

  it('sets correct rate limit headers', async () => {
    app.use(rateLimiter({ limit: 5, windowMs: 60_000 }));
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('uses custom key generator when provided', async () => {
    app.use(
      rateLimiter({
        limit: 1,
        windowMs: 60_000,
        keyGenerator: (c) => c.req.header('x-api-key') ?? 'anonymous',
      }),
    );
    app.get('/', (c) => c.text('ok'));

    // Same IP, different API keys — should be tracked separately
    const res1 = await app.request('/', {
      headers: { 'x-forwarded-for': '1.2.3.4', 'x-api-key': 'key-a' },
    });
    const res2 = await app.request('/', {
      headers: { 'x-forwarded-for': '1.2.3.4', 'x-api-key': 'key-b' },
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    app.use(rateLimiter({ limit: 1, windowMs: 60_000 }));
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
});
