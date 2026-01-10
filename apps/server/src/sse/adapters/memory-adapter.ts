import { EventEmitter } from 'events';
import type { SSEAdapter, SSEEventMessage } from './types';

/**
 * In-memory SSE adapter using EventEmitter.
 *
 * Suitable for:
 * - Local development
 * - Single-instance deployments
 * - Testing
 *
 * Limitations:
 * - Events only reach connections on the same instance
 * - Does not scale horizontally
 */
export class MemorySSEAdapter implements SSEAdapter {
  private emitter = new EventEmitter();
  private readonly CHANNEL = 'sse-events';

  async publish(channel: string, event: SSEEventMessage): Promise<void> {
    this.emitter.emit(this.CHANNEL, channel, event);
  }

  async subscribe(
    handler: (channel: string, event: SSEEventMessage) => void,
  ): Promise<void> {
    this.emitter.on(this.CHANNEL, handler);
  }

  async disconnect(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}
