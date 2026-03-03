import { describe, it, expect, afterEach } from 'vitest';
import {
  configureQueueNotifier,
  publishQueueNotification,
  shutdownQueueNotifier,
  subscribeToQueueNotifications,
} from '../notifier';

describe('queue notifier', () => {
  afterEach(async () => {
    configureQueueNotifier({ redisUrl: undefined });
    await shutdownQueueNotifier();
  });

  it('publish is a no-op when redis is not configured', async () => {
    configureQueueNotifier({ redisUrl: undefined });
    await expect(
      publishQueueNotification('process-url'),
    ).resolves.toBeUndefined();
  });

  it('subscribe returns null when redis is not configured', async () => {
    configureQueueNotifier({ redisUrl: undefined });
    const subscription = await subscribeToQueueNotifications(() => undefined);
    expect(subscription).toBeNull();
  });
});
