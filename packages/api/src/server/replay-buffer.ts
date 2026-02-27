/**
 * Per-user ring buffer for SSE event replay on reconnection.
 *
 * Events are stored with monotonic IDs and evicted after TTL expires.
 * In-memory only — buffer is lost on server restart.
 */

import type { SSEEvent } from '../contracts/events';

const DEFAULT_TTL_MS = 120_000; // 2 minutes
const DEFAULT_MAX_PER_USER = 200;

interface BufferedEvent {
  id: string;
  event: SSEEvent;
  timestamp: number;
}

export class SSEReplayBuffer {
  private buffers = new Map<string, BufferedEvent[]>();
  private counter = 0;
  private readonly ttlMs: number;
  private readonly maxPerUser: number;

  constructor(opts?: { ttlMs?: number; maxPerUser?: number }) {
    this.ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxPerUser = opts?.maxPerUser ?? DEFAULT_MAX_PER_USER;
  }

  /** Push an event into the user's buffer and return its assigned ID. */
  push(userId: string, event: SSEEvent): string {
    this.counter++;
    const id = String(this.counter);
    const entry: BufferedEvent = { id, event, timestamp: Date.now() };

    let buffer = this.buffers.get(userId);
    if (!buffer) {
      buffer = [];
      this.buffers.set(userId, buffer);
    }

    buffer.push(entry);

    // Evict expired + overflow
    this.evict(userId);

    return id;
  }

  /** Return all buffered events for the user with ID > afterId. */
  getAfter(
    userId: string,
    afterId: string,
  ): Array<{ id: string; event: SSEEvent }> {
    const buffer = this.buffers.get(userId);
    if (!buffer) return [];

    this.evict(userId);

    const numericAfter = Number(afterId);
    return buffer
      .filter((entry) => Number(entry.id) > numericAfter)
      .map(({ id, event }) => ({ id, event }));
  }

  private evict(userId: string): void {
    const buffer = this.buffers.get(userId);
    if (!buffer) return;

    const now = Date.now();
    // Remove expired entries from the front
    while (buffer.length > 0 && now - buffer[0]!.timestamp > this.ttlMs) {
      buffer.shift();
    }
    // Cap at max
    while (buffer.length > this.maxPerUser) {
      buffer.shift();
    }

    if (buffer.length === 0) {
      this.buffers.delete(userId);
    }
  }

  /** Clear all buffers (for testing). */
  clear(): void {
    this.buffers.clear();
    this.counter = 0;
  }
}

export const sseReplayBuffer = new SSEReplayBuffer();
