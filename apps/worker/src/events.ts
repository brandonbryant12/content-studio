import type { EntityChangeEvent, SSEEvent } from '@repo/api/contracts';

export type PublishEvent = (userId: string, event: SSEEvent) => void;

export function emitEntityChange(
  publishEvent: PublishEvent,
  userId: string,
  entityType: 'podcast' | 'voiceover' | 'infographic' | 'document',
  entityId: string,
): void {
  const event: EntityChangeEvent = {
    type: 'entity_change',
    entityType,
    changeType: 'update',
    entityId,
    userId,
    timestamp: new Date().toISOString(),
  };
  publishEvent(userId, event);
}
