import { createClient } from 'redis';
import type { JobType } from './types';

const LOG_PREFIX = '[Queue Notifier]';

export const DEFAULT_QUEUE_NOTIFY_CHANNEL = 'cs:queue:notify';

export interface QueueNotification {
  readonly type: JobType;
}

interface QueueNotifierConfig {
  redisUrl?: string;
  channel?: string;
}

export interface QueueNotificationSubscription {
  close: () => Promise<void>;
}

type RedisClient = ReturnType<typeof createClient>;

let config: Required<Pick<QueueNotifierConfig, 'channel'>> &
  Pick<QueueNotifierConfig, 'redisUrl'> = {
  redisUrl: undefined,
  channel: DEFAULT_QUEUE_NOTIFY_CHANNEL,
};

let redisPublisher: RedisClient | null = null;
let redisPublisherConnect: Promise<RedisClient> | null = null;

const normalizeRedisUrl = (input: string | undefined): string | undefined => {
  const trimmed = input?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const closeRedisClient = async (client: RedisClient): Promise<void> => {
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
};

const ensureRedisPublisher = async (): Promise<RedisClient> => {
  if (redisPublisher?.isOpen) {
    return redisPublisher;
  }

  if (redisPublisherConnect) {
    return redisPublisherConnect;
  }

  const redisUrl = config.redisUrl;
  if (!redisUrl) {
    throw new Error('Redis URL not configured for queue notifier');
  }

  const client = createClient({ url: redisUrl });
  client.on('error', (error) => {
    console.error(`${LOG_PREFIX} Redis publisher error`, error);
  });

  redisPublisherConnect = client
    .connect()
    .then(() => {
      redisPublisher = client;
      redisPublisherConnect = null;
      return client;
    })
    .catch((error) => {
      redisPublisherConnect = null;
      throw error;
    });

  return redisPublisherConnect;
};

const parseQueueNotification = (message: string): QueueNotification | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('type' in parsed) ||
    typeof parsed.type !== 'string'
  ) {
    return null;
  }

  return { type: parsed.type as JobType };
};

export function configureQueueNotifier(next: QueueNotifierConfig): void {
  const redisUrl =
    next.redisUrl === undefined
      ? config.redisUrl
      : normalizeRedisUrl(next.redisUrl);
  const channel =
    next.channel?.trim() || config.channel || DEFAULT_QUEUE_NOTIFY_CHANNEL;
  const redisChanged = redisUrl !== config.redisUrl;

  config = { redisUrl, channel };

  if (redisChanged && redisPublisher) {
    const previous = redisPublisher;
    redisPublisher = null;
    redisPublisherConnect = null;
    void closeRedisClient(previous);
  }
}

export async function publishQueueNotification(type: JobType): Promise<void> {
  if (!config.redisUrl) {
    return;
  }

  const client = await ensureRedisPublisher();
  const payload: QueueNotification = { type };
  await client.publish(config.channel, JSON.stringify(payload));
}

export async function subscribeToQueueNotifications(
  onNotification: (payload: QueueNotification) => void,
): Promise<QueueNotificationSubscription | null> {
  const redisUrl = config.redisUrl;
  if (!redisUrl) {
    return null;
  }

  const subscriber = createClient({ url: redisUrl });
  subscriber.on('error', (error) => {
    console.error(`${LOG_PREFIX} Redis subscriber error`, error);
  });

  const onMessage = (message: string) => {
    const payload = parseQueueNotification(message);
    if (!payload) {
      console.warn(`${LOG_PREFIX} Ignored invalid payload: ${message}`);
      return;
    }

    onNotification(payload);
  };

  await subscriber.connect();
  await subscriber.subscribe(config.channel, onMessage);

  let closed = false;
  return {
    close: async () => {
      if (closed) return;
      closed = true;

      try {
        await subscriber.unsubscribe(config.channel, onMessage);
      } catch {
        // Best-effort cleanup.
      }

      await closeRedisClient(subscriber);
    },
  };
}

export async function shutdownQueueNotifier(): Promise<void> {
  if (redisPublisherConnect) {
    await redisPublisherConnect.catch(() => undefined);
    redisPublisherConnect = null;
  }

  if (!redisPublisher) {
    return;
  }

  const client = redisPublisher;
  redisPublisher = null;
  await closeRedisClient(client);
}
