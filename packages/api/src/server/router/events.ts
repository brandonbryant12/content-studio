import { withEventMeta } from '@orpc/server';
import { protectedProcedure } from '../orpc';
import { ssePublisher } from '../publisher';
import { sseReplayBuffer } from '../replay-buffer';

function stripSseMeta<T>(event: T): {
  sseId: string | undefined;
  cleanEvent: T;
} {
  if (!event || typeof event !== 'object') {
    return { sseId: undefined, cleanEvent: event };
  }

  const rawEvent = event as unknown as Record<string, unknown>;
  const { __sseId, ...cleanEvent } = rawEvent;

  return {
    sseId: typeof __sseId === 'string' ? __sseId : undefined,
    cleanEvent: cleanEvent as unknown as T,
  };
}

const eventsRouter = {
  subscribe: protectedProcedure.events.subscribe.handler(async function* ({
    context,
    signal,
    lastEventId,
  }) {
    const userId = context.user.id;

    // 1. Subscribe to live stream FIRST (before replay) to avoid race
    const liveIterator = ssePublisher.subscribe(userId, { signal });

    // 2. Yield connected event with ID "0"
    yield withEventMeta({ type: 'connected' as const, userId }, { id: '0' });

    // 3. If resuming, replay buffered events
    let lastSeenId = lastEventId;
    if (lastSeenId) {
      const missed = sseReplayBuffer.getAfter(userId, lastSeenId);
      for (const { id, event } of missed) {
        yield withEventMeta(event, { id });
        lastSeenId = id;
      }
    }

    // 4. Consume live events, dedup against replayed events, and tag with IDs
    for await (const event of liveIterator) {
      if (signal?.aborted) break;

      // Extract the __sseId tagged by publisher
      const { sseId, cleanEvent } = stripSseMeta(event);

      // Skip if we already replayed this event
      if (sseId && lastSeenId && Number(sseId) <= Number(lastSeenId)) {
        continue;
      }

      // Strip internal field and yield with event meta
      const id = sseId ?? String(Date.now());

      yield withEventMeta(cleanEvent, { id });
      if (sseId) lastSeenId = sseId;
    }
  }),
};

export default eventsRouter;
