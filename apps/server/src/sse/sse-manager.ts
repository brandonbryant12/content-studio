import { EventEmitter } from 'events';
import type { SSEEvent } from '@repo/api/contracts';

/**
 * SSE Manager for real-time event broadcasting to connected clients.
 *
 * Architecture:
 * - In-process event bus using EventEmitter
 * - Map of userId → Set of SSE writers (supports multiple tabs/devices per user)
 * - For horizontal scaling, replace EventEmitter with Redis pub/sub
 */

interface SSEWriter {
  write: (data: Uint8Array) => Promise<void>;
}

class SSEManager {
  private emitter = new EventEmitter();
  private connections = new Map<string, Set<SSEWriter>>();

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
   * Emit an event to a specific user's connections
   */
  emit(userId: string, event: SSEEvent): void {
    const writers = this.connections.get(userId);
    if (!writers) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;
    const encoded = new TextEncoder().encode(data);

    for (const writer of writers) {
      writer.write(encoded).catch(() => {
        // Writer closed, will be cleaned up on disconnect
      });
    }
  }

  /**
   * Broadcast an event to all connected users
   */
  broadcast(event: SSEEvent): void {
    for (const userId of this.connections.keys()) {
      this.emit(userId, event);
    }
  }

  /**
   * Get number of active connections (for monitoring)
   */
  getConnectionCount(): number {
    let count = 0;
    for (const writers of this.connections.values()) {
      count += writers.size;
    }
    return count;
  }

  /**
   * Get number of unique connected users (for monitoring)
   */
  getConnectedUserCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const sseManager = new SSEManager();
