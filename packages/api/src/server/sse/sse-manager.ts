import { Context, Layer } from 'effect';
import type { SSEEvent } from '../../contracts/events';
import type { SSEManagerService, SSEWriter } from './types';

/**
 * SSE Manager Context Tag for Effect dependency injection.
 */
export class SSEManager extends Context.Tag('SSEManager')<
  SSEManager,
  SSEManagerService
>() {}

/**
 * Create an SSE Manager implementation.
 *
 * Architecture:
 * - In-process event bus using Map of connections
 * - Map of userId → Set of SSE writers (supports multiple tabs/devices per user)
 * - For horizontal scaling, replace with Redis pub/sub implementation
 */
const createSSEManagerImpl = (): SSEManagerService => {
  const connections = new Map<string, Set<SSEWriter>>();

  return {
    subscribe(userId: string, writer: SSEWriter): () => void {
      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId)!.add(writer);

      return () => {
        const writers = connections.get(userId);
        if (writers) {
          writers.delete(writer);
          if (writers.size === 0) {
            connections.delete(userId);
          }
        }
      };
    },

    emit(userId: string, event: SSEEvent): void {
      const writers = connections.get(userId);
      if (!writers) return;

      const data = `data: ${JSON.stringify(event)}\n\n`;
      const encoded = new TextEncoder().encode(data);

      for (const writer of writers) {
        writer.write(encoded).catch(() => {
          // Writer closed, will be cleaned up on disconnect
        });
      }
    },

    broadcast(event: SSEEvent): void {
      for (const userId of connections.keys()) {
        this.emit(userId, event);
      }
    },

    getConnectionCount(): number {
      let count = 0;
      for (const writers of connections.values()) {
        count += writers.size;
      }
      return count;
    },

    getConnectedUserCount(): number {
      return connections.size;
    },
  };
};

/**
 * Live layer that provides the SSE Manager service.
 */
export const SSEManagerLive = Layer.succeed(SSEManager, createSSEManagerImpl());

/**
 * Create a standalone SSE Manager instance (for use outside Effect context).
 * This is useful when you need to access the manager directly without Effect.
 */
export const createSSEManager = (): SSEManagerService => createSSEManagerImpl();
