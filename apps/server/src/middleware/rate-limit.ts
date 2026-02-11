import type { Context, MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Function to derive a key from the request (defaults to IP) */
  keyGenerator?: (c: Context) => string;
  /** Cleanup interval for expired entries in milliseconds (default: 60s) */
  cleanupIntervalMs?: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory sliding-window rate limiter for Hono.
 *
 * For horizontal scaling, swap with a Redis-backed implementation.
 */
export const rateLimiter = (opts: RateLimitOptions): MiddlewareHandler => {
  const {
    limit,
    windowMs,
    keyGenerator = defaultKeyGenerator,
    cleanupIntervalMs = 60_000,
  } = opts;

  const store = new Map<string, WindowEntry>();

  // Periodic cleanup of expired entries to prevent memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, cleanupIntervalMs);
  cleanupTimer.unref();

  return async (c, next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set standard rate limit headers
    const remaining = Math.max(0, limit - entry.count);
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > limit) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();
  };
};

function defaultKeyGenerator(c: Context): string {
  // Try common proxy headers, fall back to socket address
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp;
  }
  // Fallback — won't be unique behind a proxy but safe default
  return 'unknown';
}

/**
 * Stricter rate limit for auth endpoints (login, register).
 * 20 requests per 15 minutes per IP.
 */
export const authRateLimit = rateLimiter({
  limit: 20,
  windowMs: 15 * 60 * 1000,
});

/**
 * General API rate limit.
 * 200 requests per minute per IP.
 */
export const apiRateLimit = rateLimiter({
  limit: 200,
  windowMs: 60 * 1000,
});
