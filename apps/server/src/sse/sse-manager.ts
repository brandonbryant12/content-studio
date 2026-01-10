import type { SSEEvent } from '@repo/api/contracts';
import type { SSEAdapter, SSEEventMessage } from './adapters';
import { MemorySSEAdapter } from './adapters';

/**
 * SSE Manager for real-time event broadcasting to connected clients.
 *
 * Architecture:
 * - Pluggable adapter pattern for event distribution
 * - Map of userId → Set of SSE writers (supports multiple tabs/devices per user)
 * - Memory adapter: local EventEmitter for single-instance deployments
 * - Redis adapter: pub/sub for multi-replica EKS deployments
 *
 * Event flow (multi-instance):
 * 1. Worker or handler calls sseManager.emit(userId, event)
 * 2. SSEManager publishes to adapter (e.g., Redis)
 * 3. All instances receive event via adapter subscription
 * 4. Each instance delivers to local connections only
 */

interface SSEWriter {
  write: (data: Uint8Array) => Promise<void>;
}

export class SSEManager {
  private adapter: SSEAdapter;
  private connections = new Map<string, Set<SSEWriter>>();
  private initialized = false;

  constructor(adapter?: SSEAdapter) {
    this.adapter = adapter ?? new MemorySSEAdapter();
  }

  /**
   * Initialize the adapter subscription.
   * Must be called once after construction to start receiving events.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.adapter.subscribe((channel, event) => {
      this.deliverLocally(channel, event);
    });
    this.initialized = true;
  }

  /**
   * Subscribe a user's SSE connection
   * @returns Unsubscribe function to call on disconnect
   */
  subscribe(userId: string, writer: SSEWriter): () => void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(writer);

    return () => {
      const writers = this.connections.get(userId);
      if (writers) {
        writers.delete(writer);
        if (writers.size === 0) {
          this.connections.delete(userId);
        }
      }
    };
  }

  /**
   * Emit an event to a specific user's connections (across all instances)
   */
  async emit(userId: string, event: SSEEvent): Promise<void> {
    const message: SSEEventMessage = {
      type: event.type,
      userId,
      data: event,
    };
    await this.adapter.publish(`user:${userId}`, message);
  }

  /**
   * Broadcast an event to all connected users (across all instances)
   */
  async broadcast(event: SSEEvent): Promise<void> {
    const message: SSEEventMessage = {
      type: event.type,
      userId: undefined,
      data: event,
    };
    await this.adapter.publish('broadcast', message);
  }

  /**
   * Deliver event to connections on THIS instance only.
   * Called by adapter when events are received.
   */
  private deliverLocally(channel: string, event: SSEEventMessage): void {
    const sseEvent = event.data as SSEEvent;
    const data = `data: ${JSON.stringify(sseEvent)}\n\n`;
    const encoded = new TextEncoder().encode(data);

    if (event.userId) {
      // Targeted event for specific user
      const writers = this.connections.get(event.userId);
      if (writers) {
        for (const writer of writers) {
          writer.write(encoded).catch(() => {
            // Writer closed, will be cleaned up on disconnect
          });
        }
      }
    } else {
      // Broadcast to all local connections
      for (const writers of this.connections.values()) {
        for (const writer of writers) {
          writer.write(encoded).catch(() => {
            // Writer closed, will be cleaned up on disconnect
          });
        }
      }
    }
  }

  /**
   * Get number of active connections on this instance (for monitoring)
   */
  getConnectionCount(): number {
    let count = 0;
    for (const writers of this.connections.values()) {
      count += writers.size;
    }
    return count;
  }

  /**
   * Get number of unique connected users on this instance (for monitoring)
   */
  getConnectedUserCount(): number {
    return this.connections.size;
  }

  /**
   * Gracefully shutdown the adapter (close Redis connections, etc.)
   */
  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
    this.initialized = false;
  }
}

// Default singleton with memory adapter for backward compatibility
// For production with Redis, use createSSEManager() from factory
export const sseManager = new SSEManager();
