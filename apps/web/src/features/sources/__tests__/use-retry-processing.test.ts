import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRetryProcessing } from '../hooks/use-retry-processing';
import { getSourceQueryKey } from '../hooks/use-source';
import { getSourceListQueryKey } from '../hooks/use-source-list';

const {
  setQueryDataSpy,
  invalidateQueriesSpy,
  mutationOptionsSpy,
  useMutationSpy,
  toastSuccessSpy,
} = vi.hoisted(() => ({
  setQueryDataSpy: vi.fn(),
  invalidateQueriesSpy: vi.fn(),
  mutationOptionsSpy: vi.fn(),
  useMutationSpy: vi.fn(),
  toastSuccessSpy: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: setQueryDataSpy,
    invalidateQueries: invalidateQueriesSpy,
  }),
  useMutation: useMutationSpy,
}));

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    sources: {
      get: {
        queryOptions: ({ input }: { input: { id: string } }) => ({
          queryKey: ['sources', 'get', input.id],
        }),
      },
      list: {
        queryOptions: () => ({
          queryKey: ['sources', 'list'],
        }),
      },
      retry: {
        mutationOptions: mutationOptionsSpy,
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessSpy,
    error: vi.fn(),
  },
}));

describe('useRetryProcessing', () => {
  beforeEach(() => {
    setQueryDataSpy.mockReset();
    invalidateQueriesSpy.mockReset();
    mutationOptionsSpy.mockReset();
    useMutationSpy.mockReset();
    toastSuccessSpy.mockReset();

    mutationOptionsSpy.mockImplementation((options) => options);
    useMutationSpy.mockImplementation((options) => options);
  });

  it('updates active source cache immediately when retry succeeds', () => {
    useRetryProcessing();

    const mutationOptions = mutationOptionsSpy.mock.calls[0]?.[0] as
      | {
          onSuccess?: (
            source: { id: string },
            variables: { id: string },
          ) => void;
        }
      | undefined;
    expect(mutationOptions?.onSuccess).toBeTypeOf('function');

    const nextSource = { id: 'doc-123' };
    mutationOptions?.onSuccess?.(nextSource, { id: 'doc-123' });

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      getSourceQueryKey('doc-123'),
      nextSource,
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: getSourceListQueryKey(),
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith(
      'Retrying — content is being reprocessed',
    );
  });
});
