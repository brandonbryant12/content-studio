import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSEManager } from '../sse-manager';
import { MemorySSEAdapter } from '../adapters/memory-adapter';
import type { SSEEvent } from '@repo/api/contracts';

describe('SSEManager', () => {
  let manager: SSEManager;

  beforeEach(async () => {
    manager = new SSEManager(new MemorySSEAdapter());
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.disconnect();
  });

  describe('subscribe/unsubscribe', () => {
    it('should track connections', () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      expect(manager.getConnectionCount()).toBe(0);
      expect(manager.getConnectedUserCount()).toBe(0);

      const unsubscribe = manager.subscribe('user-1', mockWriter);

      expect(manager.getConnectionCount()).toBe(1);
      expect(manager.getConnectedUserCount()).toBe(1);

      unsubscribe();

      expect(manager.getConnectionCount()).toBe(0);
      expect(manager.getConnectedUserCount()).toBe(0);
    });

    it('should support multiple connections per user', () => {
      const mockWriter1 = { write: vi.fn().mockResolvedValue(undefined) };
      const mockWriter2 = { write: vi.fn().mockResolvedValue(undefined) };

      const unsub1 = manager.subscribe('user-1', mockWriter1);
      const unsub2 = manager.subscribe('user-1', mockWriter2);

      expect(manager.getConnectionCount()).toBe(2);
      expect(manager.getConnectedUserCount()).toBe(1);

      unsub1();

      expect(manager.getConnectionCount()).toBe(1);
      expect(manager.getConnectedUserCount()).toBe(1);

      unsub2();

      expect(manager.getConnectionCount()).toBe(0);
      expect(manager.getConnectedUserCount()).toBe(0);
    });

    it('should support multiple users', () => {
      const mockWriter1 = { write: vi.fn().mockResolvedValue(undefined) };
      const mockWriter2 = { write: vi.fn().mockResolvedValue(undefined) };

      manager.subscribe('user-1', mockWriter1);
      manager.subscribe('user-2', mockWriter2);

      expect(manager.getConnectionCount()).toBe(2);
      expect(manager.getConnectedUserCount()).toBe(2);
    });
  });

  describe('emit', () => {
    it('should send event to specific user', async () => {
      const mockWriter = { write: vi.fn().mockResolvedValue(undefined) };
      manager.subscribe('user-1', mockWriter);

      const event: SSEEvent = {
        type: 'entity_change',
        entityType: 'podcast',
        changeType: 'update',
        entityId: 'podcast-123',
        userId: 'user-1',
        timestamp: new Date().toISOString(),
      };

      await manager.emit('user-1', event);

      // Give time for async delivery
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockWriter.write).toHaveBeenCalled();
      const writtenData = mockWriter.write.mock.calls[0]![0] as Uint8Array;
      const text = new TextDecoder().decode(writtenData);
      expect(text).toContain('entity_change');
      expect(text).toContain('podcast-123');
    });

    it('should not send to other users', async () => {
      const user1Writer = { write: vi.fn().mockResolvedValue(undefined) };
      const user2Writer = { write: vi.fn().mockResolvedValue(undefined) };

      manager.subscribe('user-1', user1Writer);
      manager.subscribe('user-2', user2Writer);

      const event: SSEEvent = {
        type: 'job_completion',
        jobId: 'job-1',
        jobType: 'generate-podcast',
        status: 'completed',
        podcastId: 'podcast-1',
      };

      await manager.emit('user-1', event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(user1Writer.write).toHaveBeenCalled();
      expect(user2Writer.write).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('should send event to all users', async () => {
      const user1Writer = { write: vi.fn().mockResolvedValue(undefined) };
      const user2Writer = { write: vi.fn().mockResolvedValue(undefined) };

      manager.subscribe('user-1', user1Writer);
      manager.subscribe('user-2', user2Writer);

      const event: SSEEvent = {
        type: 'entity_change',
        entityType: 'document',
        changeType: 'insert',
        entityId: 'doc-1',
        userId: 'system',
        timestamp: new Date().toISOString(),
      };

      await manager.broadcast(event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(user1Writer.write).toHaveBeenCalled();
      expect(user2Writer.write).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should only initialize once', async () => {
      const manager2 = new SSEManager(new MemorySSEAdapter());

      // First init
      await manager2.initialize();

      // Second init should be no-op
      await manager2.initialize();

      // Should still work
      const mockWriter = { write: vi.fn().mockResolvedValue(undefined) };
      manager2.subscribe('user-1', mockWriter);

      expect(manager2.getConnectionCount()).toBe(1);

      await manager2.disconnect();
    });
  });

  describe('error handling', () => {
    it('should gracefully handle writer errors', async () => {
      const errorWriter = {
        write: vi.fn().mockRejectedValue(new Error('Connection closed')),
      };

      manager.subscribe('user-1', errorWriter);

      const event: SSEEvent = {
        type: 'entity_change',
        entityType: 'podcast',
        changeType: 'update',
        entityId: 'podcast-1',
        userId: 'user-1',
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      await expect(manager.emit('user-1', event)).resolves.not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Writer was called even though it rejected
      expect(errorWriter.write).toHaveBeenCalled();
    });
  });
});
