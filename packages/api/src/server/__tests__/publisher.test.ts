import { afterEach, describe, expect, it } from 'vitest';
import type { SSEEvent } from '../../contracts/events';
import {
  configureSSEPublisher,
  publishSSEEvent,
  shutdownSSEPublisher,
  ssePublisher,
  subscribeToSSEEvents,
} from '../publisher';

const testEvent: SSEEvent = {
  type: 'entity_change',
  entityType: 'podcast',
  changeType: 'update',
  entityId: 'pod_1',
  userId: 'user_1',
  timestamp: '2026-02-15T00:00:00.000Z',
};

afterEach(async () => {
  configureSSEPublisher({ redisUrl: undefined, channelPrefix: 'cs:sse:user' });
  await shutdownSSEPublisher();
});

describe('sse publisher', () => {
  it('publishes and subscribes through in-memory fallback', async () => {
    configureSSEPublisher({ redisUrl: undefined, channelPrefix: 'test:user' });

    const abort = new AbortController();
    const iterator = subscribeToSSEEvents('user_1', {
      signal: abort.signal,
    })[Symbol.asyncIterator]();

    const nextEvent = iterator.next();
    await publishSSEEvent('user_1', testEvent);

    const received = await nextEvent;
    expect(received.done).toBe(false);
    expect(received.value).toEqual(testEvent);

    abort.abort();
    await iterator.return?.();
  });

  it('supports fire-and-forget publish API', async () => {
    configureSSEPublisher({ redisUrl: undefined, channelPrefix: 'test:user' });

    const abort = new AbortController();
    const iterator = ssePublisher
      .subscribe('user_2', { signal: abort.signal })
      [Symbol.asyncIterator]();

    const pending = iterator.next();
    ssePublisher.publish('user_2', { ...testEvent, userId: 'user_2' });

    const received = await pending;
    expect(received.done).toBe(false);
    expect(received.value).toEqual({ ...testEvent, userId: 'user_2' });

    abort.abort();
    await iterator.return?.();
  });
});
