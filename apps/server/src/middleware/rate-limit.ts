import { createClient } from 'redis';
import type { Context, MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyGenerator?: (c: Context) => string;
  trustProxyHeaders?: boolean;
  cleanupIntervalMs?: number;
  redisUrl?: string;
  keyPrefix?: string;
  /**
   * Optional store override for tests or custom integrations.
   */
  store?: RateLimitStore;
  /**
   * Optional callback when the primary store fails and fallback is used.
   */
  onStoreError?: (error: unknown) => void;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

interface RateLimitSnapshot {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  consume: (
    key: string,
    windowMs: number,
    now: number,
  ) => Promise<RateLimitSnapshot> | RateLimitSnapshot;
  shutdown?: () => Promise<void>;
}

const DEFAULT_KEY_PREFIX = 'cs:rate-limit';
const LOG_PREFIX = '[RateLimit]';

const REDIS_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end

local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  ttl = tonumber(ARGV[1])
  redis.call('PEXPIRE', KEYS[1], ttl)
end

return { current, ttl }
`;

const redisBackedStores = new Set<RateLimitStore>();

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function createInMemoryStore(cleanupIntervalMs: number): RateLimitStore {
  const store = new Map<string, WindowEntry>();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, cleanupIntervalMs);
  cleanupTimer.unref();

  return {
    consume: (key, windowMs, now) => {
      let entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }

      entry.count += 1;
      return { count: entry.count, resetAt: entry.resetAt };
    },
  };
}

function createRedisStore(redisUrl: string, keyPrefix: string): RateLimitStore {
  const client = createClient({ url: redisUrl });
  let connectPromise: Promise<unknown> | null = null;

  client.on('error', (error) => {
    console.error(`${LOG_PREFIX} Redis client error`, error);
  });

  const ensureConnected = async () => {
    if (client.isOpen) return;
    if (connectPromise) return connectPromise;

    connectPromise = client.connect().finally(() => {
      connectPromise = null;
    });

    await connectPromise;
  };

  return {
    consume: async (key, windowMs, now) => {
      await ensureConnected();

      const raw = await client.eval(REDIS_WINDOW_SCRIPT, {
        keys: [`${keyPrefix}:${key}`],
        arguments: [String(windowMs)],
      });

      const tuple = Array.isArray(raw) ? raw : [];
      const count = toNumber(tuple[0], 1);
      const ttlMs = Math.max(0, toNumber(tuple[1], windowMs));

      return {
        count,
        resetAt: now + (ttlMs > 0 ? ttlMs : windowMs),
      };
    },
    shutdown: async () => {
      if (connectPromise) {
        await connectPromise.catch(() => undefined);
        connectPromise = null;
      }

      if (!client.isOpen) {
        return;
      }

      try {
        await client.quit();
      } catch {
        client.disconnect();
      }
    },
  };
}

function createResilientStore(
  primary: RateLimitStore,
  fallback: RateLimitStore,
  onError?: (error: unknown) => void,
): RateLimitStore {
  return {
    consume: async (key, windowMs, now) => {
      try {
        return await primary.consume(key, windowMs, now);
      } catch (error) {
        onError?.(error);
        return fallback.consume(key, windowMs, now);
      }
    },
    shutdown: async () => {
      await Promise.all([
        primary.shutdown?.().catch(() => undefined),
        fallback.shutdown?.().catch(() => undefined),
      ]);
    },
  };
}

export const rateLimiter = (opts: RateLimitOptions): MiddlewareHandler => {
  const {
    limit,
    windowMs,
    keyGenerator,
    trustProxyHeaders = false,
    cleanupIntervalMs = 60_000,
    redisUrl,
    keyPrefix = DEFAULT_KEY_PREFIX,
    store,
    onStoreError,
  } = opts;

  const fallbackStore = createInMemoryStore(cleanupIntervalMs);
  let loggedStoreFailure = false;

  const activeStore: RateLimitStore = store
    ? store
    : redisUrl
      ? createResilientStore(
          createRedisStore(redisUrl, keyPrefix),
          fallbackStore,
          (error) => {
            if (!loggedStoreFailure) {
              loggedStoreFailure = true;
              console.error(
                `${LOG_PREFIX} Primary store failed, using in-memory fallback`,
                error,
              );
            }
            onStoreError?.(error);
          },
        )
      : fallbackStore;

  if (!store && redisUrl) {
    redisBackedStores.add(activeStore);
  }

  const activeKeyGenerator =
    keyGenerator ?? createDefaultKeyGenerator({ trustProxyHeaders });

  return async (c, next) => {
    const key = activeKeyGenerator(c);
    const now = Date.now();
    const snapshot = await activeStore.consume(key, windowMs, now);

    const remaining = Math.max(0, limit - snapshot.count);
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(snapshot.resetAt / 1000)));

    if (snapshot.count > limit) {
      c.header(
        'Retry-After',
        String(Math.max(1, Math.ceil((snapshot.resetAt - now) / 1000))),
      );
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();
  };
};

interface KeyGeneratorOptions {
  trustProxyHeaders: boolean;
}

function getFirstForwardedIp(value: string): string | null {
  const first = value.split(',')[0]?.trim();
  if (!first) return null;
  return first;
}

function getConnectionRemoteAddress(c: Context): string | null {
  const incoming = (
    c as Context & {
      env?: { incoming?: { socket?: { remoteAddress?: unknown } } };
    }
  ).env?.incoming;
  const remoteAddress = incoming?.socket?.remoteAddress;

  if (typeof remoteAddress === 'string' && remoteAddress.trim().length > 0) {
    return remoteAddress.trim();
  }

  return null;
}

export function createDefaultKeyGenerator(opts: KeyGeneratorOptions) {
  return (c: Context): string => {
    if (opts.trustProxyHeaders) {
      const forwarded = c.req.header('x-forwarded-for');
      if (forwarded) {
        const forwardedIp = getFirstForwardedIp(forwarded);
        if (forwardedIp) return forwardedIp;
      }

      const realIp = c.req.header('x-real-ip');
      if (realIp?.trim()) {
        return realIp.trim();
      }
    }

    const connectionRemoteAddress = getConnectionRemoteAddress(c);
    if (connectionRemoteAddress) {
      return connectionRemoteAddress;
    }

    return 'unknown';
  };
}

export async function shutdownRateLimiters(): Promise<void> {
  const stores = [...redisBackedStores];
  redisBackedStores.clear();

  await Promise.all(stores.map((s) => s.shutdown?.().catch(() => undefined)));
}

interface RateLimitFactoryOptions
  extends Pick<RateLimitOptions, 'redisUrl' | 'trustProxyHeaders'> {
  limit?: number;
  windowMs?: number;
}

export const createAuthRateLimit = (opts: RateLimitFactoryOptions = {}) =>
  rateLimiter({
    limit: opts.limit ?? 120,
    windowMs: opts.windowMs ?? 15 * 60 * 1000,
    trustProxyHeaders: opts.trustProxyHeaders,
    redisUrl: opts.redisUrl,
    keyPrefix: `${DEFAULT_KEY_PREFIX}:auth`,
  });

export const createApiRateLimit = (opts: RateLimitFactoryOptions = {}) =>
  rateLimiter({
    limit: opts.limit ?? 200,
    windowMs: opts.windowMs ?? 60 * 1000,
    trustProxyHeaders: opts.trustProxyHeaders,
    redisUrl: opts.redisUrl,
    keyPrefix: `${DEFAULT_KEY_PREFIX}:api`,
  });

export const authRateLimit = createAuthRateLimit();
export const apiRateLimit = createApiRateLimit();
