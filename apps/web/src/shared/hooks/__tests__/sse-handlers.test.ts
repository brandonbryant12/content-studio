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
import { getActivityListQueryKey } from '@/features/admin/hooks';
import { getDocumentQueryKey } from '@/features/documents/hooks/use-document';
import { getDocumentListQueryKey } from '@/features/documents/hooks/use-document-list';
import { getInfographicQueryKey } from '@/features/infographics/hooks/use-infographic';
import { getInfographicListQueryKey } from '@/features/infographics/hooks/use-infographic-list';
import { getInfographicVersionsQueryKey } from '@/features/infographics/hooks/use-infographic-versions';
import { getPersonaQueryKey } from '@/features/personas/hooks/use-persona';
import { getPersonaListQueryKey } from '@/features/personas/hooks/use-persona-list';
import { getPodcastQueryKey } from '@/features/podcasts/hooks/use-podcast';
import { getPodcastListQueryKey } from '@/features/podcasts/hooks/use-podcast-list';

vi.mock('@/clients/apiClient', () => {
  const getEntityMocks = (entity: string) => ({
    get: {
      queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
        queryKey: [entity, 'get', input.id],
      })),
    },
    list: {
      queryOptions: vi.fn(() => ({
        queryKey: [entity, 'list'],
      })),
    },
  });

  return {
    apiClient: {
      podcasts: getEntityMocks('podcasts'),
      documents: getEntityMocks('documents'),
      voiceovers: getEntityMocks('voiceovers'),
      personas: getEntityMocks('personas'),
      infographics: {
        ...getEntityMocks('infographics'),
        listVersions: {
          queryOptions: vi.fn(({ input }: { input: { id: string } }) => ({
            queryKey: ['infographics', 'versions', input.id],
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
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const setPathname = (pathname: string) => {
  window.history.replaceState({}, '', pathname);
};

const flushMicrotasks = async () => {
  await Promise.resolve();
};

const createJobEvent = (
  overrides: Partial<JobCompletionEvent>,
): JobCompletionEvent => ({
  type: 'job_completion',
  jobId: 'job-123',
  jobType: 'generate-podcast',
  status: 'completed',
  podcastId: 'podcast-456',
  ...overrides,
});

const createEntityChangeEvent = (
  entityType: EntityChangeEvent['entityType'] | 'persona',
  changeType: EntityChangeEvent['changeType'],
  entityId: string,
): EntityChangeEvent => ({
  type: 'entity_change',
  entityType: entityType as EntityChangeEvent['entityType'],
  changeType,
  entityId,
  userId: 'user-456',
  timestamp: new Date().toISOString(),
});

describe('SSE Handlers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    setPathname('/');
  });

  describe('handleJobCompletion', () => {
    it('invalidates podcast query for the specific podcast', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      handleJobCompletion(createJobEvent({}), queryClient);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getPodcastQueryKey('podcast-456'),
      });
    });

    it.each(['generate-podcast', 'generate-script', 'generate-audio'] as const)(
      'invalidates podcasts list for %s job',
      (jobType) => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        handleJobCompletion(createJobEvent({ jobType }), queryClient);

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: getPodcastListQueryKey(),
        });
      },
    );

    it('handles failed job status the same way', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      handleJobCompletion(
        createJobEvent({
          status: 'failed',
          error: 'Something went wrong',
        }),
        queryClient,
      );

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });

    it('notifies on generate-audio job completion', async () => {
      const fetchSpy = vi
        .spyOn(queryClient, 'fetchQuery')
        .mockResolvedValue({ title: 'Audio Regen' });

      handleJobCompletion(
        createJobEvent({ jobType: 'generate-audio' }),
        queryClient,
      );

      await flushMicrotasks();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith(
        'Podcast "Audio Regen" is ready',
        {},
      );
    });

    it('notifies on generate-script job failure with error', async () => {
      const fetchSpy = vi
        .spyOn(queryClient, 'fetchQuery')
        .mockResolvedValue({ title: 'Script Pass' });

      handleJobCompletion(
        createJobEvent({
          jobId: 'job-124',
          jobType: 'generate-script',
          status: 'failed',
          error: 'Script step failed',
        }),
        queryClient,
      );

      await flushMicrotasks();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith('Script step failed', {});
    });

    it('suppresses notifications when user is already viewing the podcast', async () => {
      setPathname('/podcasts/podcast-456');
      vi.spyOn(queryClient, 'fetchQuery').mockResolvedValue({
        title: 'Active Podcast',
      });

      handleJobCompletion(
        createJobEvent({ jobId: 'job-125', jobType: 'generate-audio' }),
        queryClient,
      );

      await flushMicrotasks();

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
        queryKey: getInfographicQueryKey('infographic-456'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getInfographicListQueryKey(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getInfographicVersionsQueryKey('infographic-456'),
      });
    });
  });

  describe('handleEntityChange', () => {
    it.each([
      {
        name: 'podcast update',
        event: createEntityChangeEvent('podcast', 'update', 'podcast-123'),
        expectedQueryKeys: [getPodcastQueryKey('podcast-123')],
      },
      {
        name: 'podcast insert',
        event: createEntityChangeEvent('podcast', 'insert', 'podcast-123'),
        expectedQueryKeys: [
          getPodcastQueryKey('podcast-123'),
          getPodcastListQueryKey(),
        ],
      },
      {
        name: 'podcast delete',
        event: createEntityChangeEvent('podcast', 'delete', 'podcast-123'),
        expectedQueryKeys: [
          getPodcastQueryKey('podcast-123'),
          getPodcastListQueryKey(),
        ],
      },
      {
        name: 'document update',
        event: createEntityChangeEvent('document', 'update', 'doc-123'),
        expectedQueryKeys: [getDocumentQueryKey('doc-123')],
      },
      {
        name: 'document insert',
        event: createEntityChangeEvent('document', 'insert', 'doc-123'),
        expectedQueryKeys: [
          getDocumentQueryKey('doc-123'),
          getDocumentListQueryKey(),
        ],
      },
      {
        name: 'document delete',
        event: createEntityChangeEvent('document', 'delete', 'doc-123'),
        expectedQueryKeys: [
          getDocumentQueryKey('doc-123'),
          getDocumentListQueryKey(),
        ],
      },
      {
        name: 'infographic update',
        event: createEntityChangeEvent(
          'infographic',
          'update',
          'infographic-123',
        ),
        expectedQueryKeys: [
          getInfographicQueryKey('infographic-123'),
          getInfographicVersionsQueryKey('infographic-123'),
        ],
      },
      {
        name: 'persona insert',
        event: createEntityChangeEvent('persona', 'insert', 'persona-123'),
        expectedQueryKeys: [
          getPersonaQueryKey('persona-123'),
          getPersonaListQueryKey(),
        ],
      },
    ])(
      'invalidates expected queries for $name',
      ({ event, expectedQueryKeys }) => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        handleEntityChange(event, queryClient);

        expectedQueryKeys.forEach((queryKey) => {
          expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(expectedQueryKeys.length);
      },
    );
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
        queryKey: getActivityListQueryKey().slice(0, 1),
      });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });
  });
});
