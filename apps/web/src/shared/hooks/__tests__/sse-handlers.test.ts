import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  JobCompletionEvent,
  EntityChangeEvent,
} from '@repo/api/contracts';
import { handleJobCompletion, handleEntityChange } from '../sse-handlers';

// Mock the apiClient
vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    podcasts: {
      get: {
        queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
          queryKey: ['podcasts', 'get', input.id],
        })),
      },
      list: {
        queryOptions: vi.fn(() => ({
          queryKey: ['podcasts', 'list'],
        })),
      },
    },
    documents: {
      get: {
        queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
          queryKey: ['documents', 'get', input.id],
        })),
      },
      list: {
        queryOptions: vi.fn(() => ({
          queryKey: ['documents', 'list'],
        })),
      },
    },
  },
}));

describe('SSE Handlers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('handleJobCompletion', () => {
    it('invalidates podcast query for the specific podcast', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const event: JobCompletionEvent = {
        type: 'job_completion',
        jobId: 'job-123',
        jobType: 'generate-podcast',
        status: 'completed',
        podcastId: 'podcast-456',
      };

      handleJobCompletion(event, queryClient);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['podcasts', 'get', 'podcast-456'],
      });
    });

    it('invalidates podcasts list for generate-podcast job', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const event: JobCompletionEvent = {
        type: 'job_completion',
        jobId: 'job-123',
        jobType: 'generate-podcast',
        status: 'completed',
        podcastId: 'podcast-456',
      };

      handleJobCompletion(event, queryClient);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['podcasts', 'list'],
      });
    });

    it('invalidates podcasts list for generate-script job', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const event: JobCompletionEvent = {
        type: 'job_completion',
        jobId: 'job-123',
        jobType: 'generate-script',
        status: 'completed',
        podcastId: 'podcast-456',
      };

      handleJobCompletion(event, queryClient);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['podcasts', 'list'],
      });
    });

    it('invalidates podcasts list for generate-audio job', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const event: JobCompletionEvent = {
        type: 'job_completion',
        jobId: 'job-123',
        jobType: 'generate-audio',
        status: 'completed',
        podcastId: 'podcast-456',
      };

      handleJobCompletion(event, queryClient);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['podcasts', 'list'],
      });
    });

    it('handles failed job status the same way', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const event: JobCompletionEvent = {
        type: 'job_completion',
        jobId: 'job-123',
        jobType: 'generate-podcast',
        status: 'failed',
        podcastId: 'podcast-456',
        error: 'Something went wrong',
      };

      handleJobCompletion(event, queryClient);

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleEntityChange', () => {
    describe('podcast changes', () => {
      it('invalidates podcast query on update', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'podcast',
          changeType: 'update',
          entityId: 'podcast-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['podcasts', 'get', 'podcast-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      it('invalidates podcast query and list on insert', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'podcast',
          changeType: 'insert',
          entityId: 'podcast-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['podcasts', 'get', 'podcast-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['podcasts', 'list'],
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(2);
      });

      it('invalidates podcast query and list on delete', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'podcast',
          changeType: 'delete',
          entityId: 'podcast-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['podcasts', 'get', 'podcast-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['podcasts', 'list'],
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe('document changes', () => {
      it('invalidates document query on update', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'document',
          changeType: 'update',
          entityId: 'doc-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['documents', 'get', 'doc-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      it('invalidates document query and list on insert', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'document',
          changeType: 'insert',
          entityId: 'doc-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['documents', 'get', 'doc-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['documents', 'list'],
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(2);
      });

      it('invalidates document query and list on delete', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'document',
          changeType: 'delete',
          entityId: 'doc-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['documents', 'get', 'doc-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['documents', 'list'],
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(2);
      });
    });
  });
});
