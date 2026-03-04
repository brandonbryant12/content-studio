import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocumentQueryKey } from '../hooks/use-document';
import { getDocumentListQueryKey } from '../hooks/use-document-list';
import { useRetryProcessing } from '../hooks/use-retry-processing';

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
          queryKey: ['documents', 'get', input.id],
        }),
      },
      list: {
        queryOptions: () => ({
          queryKey: ['documents', 'list'],
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

  it('updates active document cache immediately when retry succeeds', () => {
    useRetryProcessing();

    const mutationOptions = mutationOptionsSpy.mock.calls[0]?.[0] as
      | {
          onSuccess?: (
            document: { id: string },
            variables: { id: string },
          ) => void;
        }
      | undefined;
    expect(mutationOptions?.onSuccess).toBeTypeOf('function');

    const nextDocument = { id: 'doc-123' };
    mutationOptions?.onSuccess?.(nextDocument, { id: 'doc-123' });

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      getDocumentQueryKey('doc-123'),
      nextDocument,
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: getDocumentListQueryKey(),
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith(
      'Retrying — content is being reprocessed',
    );
  });
});
