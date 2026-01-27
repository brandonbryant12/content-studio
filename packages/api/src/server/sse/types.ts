import type { SSEEvent } from '../../contracts/events';

/**
 * Interface for writing to an SSE connection.
 */
export interface SSEWriter {
  write: (data: Uint8Array) => Promise<void>;
}

/**
 * Interface for SSE manager operations.
 */
export interface SSEManagerService {
  /**
   * Subscribe a user's SSE connection.
   * @returns Unsubscribe function to call on disconnect.
   */
  subscribe(userId: string, writer: SSEWriter): () => void;

  /**
   * Emit an event to a specific user's connections.
   */
  emit(userId: string, event: SSEEvent): void;

  /**
   * Broadcast an event to all connected users.
   */
  broadcast(event: SSEEvent): void;

  /**
   * Get number of active connections (for monitoring).
   */
  getConnectionCount(): number;

  /**
   * Get number of unique connected users (for monitoring).
   */
  getConnectedUserCount(): number;
}
