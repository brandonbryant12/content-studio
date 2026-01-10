import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemorySSEAdapter } from '../adapters/memory-adapter';
import type { SSEEventMessage } from '../adapters/types';

describe('MemorySSEAdapter', () => {
  let adapter: MemorySSEAdapter;

  beforeEach(() => {
    adapter = new MemorySSEAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should deliver events to subscribers', async () => {
    const receivedEvents: Array<{ channel: string; event: SSEEventMessage }> =
      [];

    await adapter.subscribe((channel, event) => {
      receivedEvents.push({ channel, event });
    });

    const event: SSEEventMessage = {
      type: 'test_event',
      userId: 'user-123',
      data: { message: 'hello' },
    };

    await adapter.publish('user:user-123', event);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]).toEqual({
      channel: 'user:user-123',
      event,
    });
  });

  it('should support multiple subscribers', async () => {
    const receivedA: SSEEventMessage[] = [];
    const receivedB: SSEEventMessage[] = [];

    await adapter.subscribe((channel, event) => {
      receivedA.push(event);
    });

    await adapter.subscribe((channel, event) => {
      receivedB.push(event);
    });

    const event: SSEEventMessage = {
      type: 'test_event',
      data: { test: true },
    };

    await adapter.publish('broadcast', event);

    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(1);
  });

  it('should handle broadcast events (userId undefined)', async () => {
    const receivedEvents: SSEEventMessage[] = [];

    await adapter.subscribe((channel, event) => {
      receivedEvents.push(event);
    });

    const event: SSEEventMessage = {
      type: 'broadcast_event',
      userId: undefined,
      data: { announcement: 'system maintenance' },
    };

    await adapter.publish('broadcast', event);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]!.userId).toBeUndefined();
  });

  it('should stop receiving events after disconnect', async () => {
    const receivedEvents: SSEEventMessage[] = [];

    await adapter.subscribe((channel, event) => {
      receivedEvents.push(event);
    });

    // Send one event before disconnect
    await adapter.publish('test', { type: 'before', data: {} });
    expect(receivedEvents).toHaveLength(1);

    // Disconnect
    await adapter.disconnect();

    // Send another event - should not be received
    await adapter.publish('test', { type: 'after', data: {} });
    expect(receivedEvents).toHaveLength(1);
  });

  it('should resolve publish immediately for memory adapter', async () => {
    await adapter.subscribe(() => {});

    const start = Date.now();
    await adapter.publish('test', { type: 'test', data: {} });
    const elapsed = Date.now() - start;

    // Memory adapter should be nearly instant
    expect(elapsed).toBeLessThan(10);
  });
});
