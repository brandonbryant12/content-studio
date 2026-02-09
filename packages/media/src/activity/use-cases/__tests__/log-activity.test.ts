import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { logActivity } from '../log-activity';
import { createMockActivityLogRepo, MockDbLive } from '../../../test-utils';
import type { ActivityLog, ActivityLogId } from '@repo/db/schema';

const createMockActivityLog = (
  overrides: Partial<ActivityLog> = {},
): ActivityLog => ({
  id: 'act_0000000000000001' as ActivityLogId,
  userId: 'user-1',
  action: 'created',
  entityType: 'document',
  entityId: null,
  entityTitle: null,
  metadata: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

describe('logActivity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('success cases', () => {
    it('inserts an activity record with all fields', async () => {
      const insertSpy = vi.fn();
      const mockLog = createMockActivityLog({
        action: 'created',
        entityType: 'document',
        entityId: 'doc_0000000000000001',
        entityTitle: 'My Document',
        metadata: { status: 'draft' },
      });

      const mockRepo = createMockActivityLogRepo({
        insert: (data) => {
          insertSpy(data);
          return Effect.succeed(mockLog);
        },
      });

      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        logActivity({
          userId: 'user-1',
          action: 'created',
          entityType: 'document',
          entityId: 'doc_0000000000000001',
          entityTitle: 'My Document',
          metadata: { status: 'draft' },
        }).pipe(Effect.provide(layers)),
      );

      expect(result.id).toBe(mockLog.id);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'created',
          entityType: 'document',
          entityId: 'doc_0000000000000001',
          entityTitle: 'My Document',
          metadata: { status: 'draft' },
        }),
      );
    });

    it('inserts with minimal fields (no entityId, entityTitle, metadata)', async () => {
      const insertSpy = vi.fn();
      const mockLog = createMockActivityLog();

      const mockRepo = createMockActivityLogRepo({
        insert: (data) => {
          insertSpy(data);
          return Effect.succeed(mockLog);
        },
      });

      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromise(
        logActivity({
          userId: 'user-1',
          action: 'deleted',
          entityType: 'podcast',
        }).pipe(Effect.provide(layers)),
      );

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'deleted',
          entityType: 'podcast',
        }),
      );
    });

    it('handles all entity types', async () => {
      const entityTypes = ['document', 'podcast', 'voiceover', 'infographic'];

      for (const entityType of entityTypes) {
        const insertSpy = vi.fn();
        const mockLog = createMockActivityLog({ entityType });

        const mockRepo = createMockActivityLogRepo({
          insert: (data) => {
            insertSpy(data);
            return Effect.succeed(mockLog);
          },
        });

        const layers = Layer.mergeAll(MockDbLive, mockRepo);

        await Effect.runPromise(
          logActivity({
            userId: 'user-1',
            action: 'created',
            entityType,
          }).pipe(Effect.provide(layers)),
        );

        expect(insertSpy).toHaveBeenCalledWith(
          expect.objectContaining({ entityType }),
        );
      }
    });
  });
});
