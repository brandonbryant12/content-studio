import { EventPublisher } from '@orpc/server';
import type { SSEEvent } from '../contracts/events';

/**
 * Shared event publisher for SSE events.
 * Uses userId as the channel key for per-user event routing.
 *
 * For horizontal scaling, swap with a Redis-backed publisher.
 */
export const ssePublisher = new EventPublisher<Record<string, SSEEvent>>();
