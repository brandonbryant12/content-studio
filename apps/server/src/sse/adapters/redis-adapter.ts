import type { SSEAdapter, SSEEventMessage } from './types';
import { isSSEEventMessage } from './types';

// Redis types - optional import to avoid build failures when ioredis isn't installed
type RedisClient = {
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  quit(): Promise<string>;
};

/**
 * Redis Pub/Sub SSE adapter for horizontal scaling.
 *
 * Suitable for:
 * - EKS deployments with multiple server replicas
 * - Production environments requiring high availability
 *
 * Architecture:
 * - Uses two Redis connections (pub/sub requires separate client for subscriber)
 * - All server instances subscribe to same channel
 * - Events published by any instance are received by all instances
 *
 * Note: Requires ioredis package to be installed. Add to dependencies:
 *   "ioredis": "^5.4.1"
 */
export class RedisSSEAdapter implements SSEAdapter {
  private publisher: RedisClient;
  private subscriber: RedisClient;
  private readonly channel: string;
  private isSubscribed = false;

  constructor(redisUrl: string, channelPrefix = 'content-studio:sse') {
    this.channel = channelPrefix;

    // Dynamic import check - will throw if ioredis is not installed
    let Redis: new (
      url: string,
      options: {
        maxRetriesPerRequest: number;
        retryStrategy: (times: number) => number;
      },
    ) => RedisClient;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Redis = require('ioredis').default ?? require('ioredis');
    } catch {
      throw new Error(
        'ioredis package is required for Redis SSE adapter. Run: pnpm add ioredis --filter server',
      );
    }

    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });
    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });

    // Log connection events for observability
    this.publisher.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[RedisSSEAdapter] Publisher error:', message);
    });
    this.subscriber.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[RedisSSEAdapter] Subscriber error:', message);
    });
  }

  async publish(channel: string, event: SSEEventMessage): Promise<void> {
    const message = JSON.stringify({ channel, event });
    await this.publisher.publish(this.channel, message);
  }

  async subscribe(
    handler: (channel: string, event: SSEEventMessage) => void,
  ): Promise<void> {
    if (this.isSubscribed) {
      return;
    }

    await this.subscriber.subscribe(this.channel);
    this.isSubscribed = true;

    this.subscriber.on('message', (ch: unknown, message: unknown) => {
      if (ch !== this.channel || typeof message !== 'string') return;

      try {
        const parsed = JSON.parse(message) as {
          channel: string;
          event: unknown;
        };
        if (
          typeof parsed.channel === 'string' &&
          isSSEEventMessage(parsed.event)
        ) {
          handler(parsed.channel, parsed.event);
        }
      } catch (err) {
        console.error('[RedisSSEAdapter] Failed to parse message:', err);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.isSubscribed) {
      await this.subscriber.unsubscribe(this.channel);
      this.isSubscribed = false;
    }
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}
