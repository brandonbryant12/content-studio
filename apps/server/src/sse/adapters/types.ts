import type { SSEEvent } from '@repo/api/contracts';

/**
 * SSE Adapter interface for pluggable event distribution.
 *
 * Adapters handle publishing events across server instances.
 * - Memory adapter: local EventEmitter for single-instance deployments
 * - Redis adapter: Redis pub/sub for multi-replica EKS deployments
 */
export interface SSEAdapter {
  /**
   * Publish an event to all server instances.
   * @param channel - Channel name (e.g., 'user:123' or 'broadcast')
   * @param event - The SSE event to publish
   */
  publish(channel: string, event: SSEEventMessage): Promise<void>;

  /**
   * Subscribe to events from all instances.
   * @param handler - Callback invoked when events are received
   */
  subscribe(
    handler: (channel: string, event: SSEEventMessage) => void,
  ): Promise<void>;

  /**
   * Cleanup adapter resources (close connections).
   */
  disconnect(): Promise<void>;
}

/**
 * Internal SSE event message format used by adapters.
 * Wraps the SSEEvent with optional routing metadata.
 */
export interface SSEEventMessage {
  type: string;
  userId?: string; // undefined = broadcast to all users
  data: unknown;
}

/**
 * Type guard to check if an object is a valid SSEEventMessage.
 */
export function isSSEEventMessage(obj: unknown): obj is SSEEventMessage {
  if (typeof obj !== 'object' || obj === null) return false;
  const msg = obj as Record<string, unknown>;
  return typeof msg.type === 'string' && 'data' in msg;
}
