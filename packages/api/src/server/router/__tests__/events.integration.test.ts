import { getEventMeta } from '@repo/api/client';
import { createTestUser } from '@repo/testing';
import { Layer } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import type { SSEEvent } from '@repo/api/contracts';
import {
  configureSSEPublisher,
  publishSSEEvent,
  shutdownSSEPublisher,
} from '../../publisher';
import { sseReplayBuffer } from '../../replay-buffer';
import {
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
} from '../_shared/test-helpers';
import eventsRouter from '../events';

type ORPCProcedure = {
  '~orpc': {
    handler: (args: {
      context: unknown;
      errors: unknown;
      signal?: AbortSignal;
      lastEventId?: string;
    }) => AsyncIterable<SSEEvent> | Promise<AsyncIterable<SSEEvent>>;
  };
};

const callSubscribe = async (args: {
  context: unknown;
  signal?: AbortSignal;
  lastEventId?: string;
}) =>
  (
    (await (eventsRouter.subscribe as unknown as ORPCProcedure)[
      '~orpc'
    ].handler({
      ...args,
      errors: createMockErrors(),
    })) as AsyncIterable<SSEEvent>
  )[Symbol.asyncIterator]();

const createEntityChangeEvent = (
  userId: string,
  entityId: string,
): SSEEvent => ({
  type: 'entity_change',
  entityType: 'podcast',
  changeType: 'update',
  entityId,
  userId,
  timestamp: '2026-03-09T00:00:00.000Z',
});

afterEach(async () => {
  configureSSEPublisher({ redisUrl: undefined, channelPrefix: 'cs:sse:user' });
  await shutdownSSEPublisher();
  sseReplayBuffer.clear();
});

describe('events.subscribe', () => {
  it('replays missed events after lastEventId and deduplicates them from the live stream', async () => {
    configureSSEPublisher({ redisUrl: undefined, channelPrefix: 'test:user' });

    const user = createTestUser();
    const context = createMockContext(
      createTestServerRuntime(Layer.empty),
      user,
    );

    await publishSSEEvent(
      user.id,
      createEntityChangeEvent(user.id, 'podcast-1'),
    );

    const abort = new AbortController();
    const iterator = await callSubscribe({
      context,
      signal: abort.signal,
      lastEventId: '1',
    });

    const connected = await iterator.next();
    expect(connected.done).toBe(false);
    expect(connected.value).toMatchObject({
      type: 'connected',
      userId: user.id,
    });
    expect(getEventMeta(connected.value)?.id).toBe('0');

    await publishSSEEvent(
      user.id,
      createEntityChangeEvent(user.id, 'podcast-2'),
    );

    const replayed = await iterator.next();
    expect(replayed.done).toBe(false);
    expect(replayed.value).toMatchObject(
      createEntityChangeEvent(user.id, 'podcast-2'),
    );
    expect(getEventMeta(replayed.value)?.id).toBe('2');

    await publishSSEEvent(
      user.id,
      createEntityChangeEvent(user.id, 'podcast-3'),
    );

    const live = await iterator.next();
    expect(live.done).toBe(false);
    expect(live.value).toMatchObject(
      createEntityChangeEvent(user.id, 'podcast-3'),
    );
    expect(getEventMeta(live.value)?.id).toBe('3');

    abort.abort();
    await iterator.return?.();
  });
});
