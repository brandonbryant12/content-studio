import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  JobCompletionEvent,
  EntityChangeEvent,
  InfographicJobCompletionEvent,
  ActivityLoggedEvent,
} from '@repo/api/contracts';
import {
  handleJobCompletion,
  handleEntityChange,
  handleInfographicJobCompletion,
  handleActivityLogged,
} from '../sse-handlers';

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
    infographics: {
      get: {
        queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
          queryKey: ['infographics', 'get', input.id],
        })),
      },
      list: {
        queryOptions: vi.fn(() => ({
          queryKey: ['infographics', 'list'],
        })),
      },
      listVersions: {
        queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
          queryKey: ['infographics', 'versions', input.id],
        })),
      },
    },
    voiceovers: {
      get: {
        queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
          queryKey: ['voiceovers', 'get', input.id],
        })),
      },
      list: {
        queryOptions: vi.fn(() => ({
          queryKey: ['voiceovers', 'list'],
        })),
      },
    },
    personas: {
      get: {
        queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
          queryKey: ['personas', 'get', input.id],
        })),
      },
      list: {
        queryOptions: vi.fn(() => ({
          queryKey: ['personas', 'list'],
        })),
      },
    },
    admin: {
      list: {
        queryOptions: vi.fn(
          ({ input }: { input?: Record<string, unknown> }) => ({
            queryKey: [
              {
                scope: 'activity',
                route: 'admin.list',
              },
              input ?? {},
            ],
          }),
        ),
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const setPathname = (pathname: string) => {
  window.history.replaceState({}, '', pathname);
};

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

    it('notifies on generate-audio job completion', async () => {
      const fetchSpy = vi
        .spyOn(queryClient, 'fetchQuery')
        .mockResolvedValue({ title: 'Audio Regen' });

      handleJobCompletion(
        {
          type: 'job_completion',
          jobId: 'job-123',
          jobType: 'generate-audio',
          status: 'completed',
          podcastId: 'podcast-456',
        },
        queryClient,
      );

      await Promise.resolve();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Podcast "Audio Regen" is ready', {});
    });

    it('notifies on generate-script job failure with error', async () => {
      const fetchSpy = vi
        .spyOn(queryClient, 'fetchQuery')
        .mockResolvedValue({ title: 'Script Pass' });

      handleJobCompletion(
        {
          type: 'job_completion',
          jobId: 'job-124',
          jobType: 'generate-script',
          status: 'failed',
          podcastId: 'podcast-456',
          error: 'Script step failed',
        },
        queryClient,
      );

      await Promise.resolve();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        'Script step failed',
        {},
      );
    });

    it('suppresses notifications when user is already viewing the podcast', async () => {
      setPathname('/podcasts/podcast-456');
      vi.spyOn(queryClient, 'fetchQuery').mockResolvedValue({
        title: 'Active Podcast',
      });

      handleJobCompletion(
        {
          type: 'job_completion',
          jobId: 'job-125',
          jobType: 'generate-audio',
          status: 'completed',
          podcastId: 'podcast-456',
        },
        queryClient,
      );

      await Promise.resolve();

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('handleInfographicJobCompletion', () => {
    it('invalidates infographic, list, and versions queries', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const event: InfographicJobCompletionEvent = {
        type: 'infographic_job_completion',
        jobId: 'job-123',
        jobType: 'generate-infographic',
        status: 'completed',
        infographicId: 'infographic-456',
      };

      handleInfographicJobCompletion(event, queryClient);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['infographics', 'get', 'infographic-456'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['infographics', 'list'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['infographics', 'versions', 'infographic-456'],
      });
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

    describe('infographic changes', () => {
      it('invalidates infographic query and versions on update', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'infographic',
          changeType: 'update',
          entityId: 'infographic-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['infographics', 'get', 'infographic-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['infographics', 'versions', 'infographic-123'],
        });
      });
    });

    describe('persona changes', () => {
      it('invalidates persona query and list on insert', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const event = {
          type: 'entity_change',
          entityType: 'persona',
          changeType: 'insert',
          entityId: 'persona-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        };

        handleEntityChange(event as EntityChangeEvent, queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['personas', 'get', 'persona-123'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['personas', 'list'],
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('handleActivityLogged', () => {
    it('invalidates by canonical activity list key scope', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const event: ActivityLoggedEvent = {
        type: 'activity_logged',
        activityId: 'activity-123',
        userId: 'user-123',
        action: 'podcast_generated',
        entityType: 'podcast',
        entityId: 'podcast-123',
        timestamp: new Date().toISOString(),
      };

      handleActivityLogged(event, queryClient);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: [
          {
            scope: 'activity',
            route: 'admin.list',
          },
        ],
      });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });
  });
});
