import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOptimisticMutation } from '../use-optimistic-mutation';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type Item = { id: string; name: string };
type Variables = { name: string };
type Cache = Item[];

const queryKey = ['items'];
const initialData: Cache = [{ id: '1', name: 'Item 1' }];
const responseData: Item = { id: '2', name: 'Item 2' };

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const appendOptimisticItem = (
  current: Cache | undefined,
  variables: Variables,
): Cache => [...(current ?? []), { id: 'temp', name: variables.name }];

describe('useOptimisticMutation', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    };
  };

  const renderMutationHook = ({
    mutationFn = vi.fn().mockResolvedValue(responseData),
    getOptimisticData = appendOptimisticItem,
    successMessage,
    errorMessage,
    onSuccess,
    showSuccessToast,
  }: {
    mutationFn?: (variables: Variables) => Promise<Item>;
    getOptimisticData?: (
      current: Cache | undefined,
      variables: Variables,
    ) => Cache | undefined;
    successMessage?: string | ((data: Item) => string);
    errorMessage?: string;
    onSuccess?: (data: Item, variables: Variables) => void;
    showSuccessToast?: boolean;
  } = {}) =>
    renderHook(
      () =>
        useOptimisticMutation<Item, Variables, Cache>({
          queryKey,
          mutationFn,
          getOptimisticData,
          successMessage,
          errorMessage,
          onSuccess,
          showSuccessToast,
        }),
      { wrapper: createWrapper() },
    );

  const mutateWithName = (
    mutate: (variables: Variables) => void,
    name = 'Item 2',
  ) => {
    act(() => {
      mutate({ name });
    });
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('applies optimistic update to cache on mutate', async () => {
    const deferred = createDeferred<Item>();
    const mutationFn = vi.fn(() => deferred.promise);
    const getOptimisticData = vi.fn(appendOptimisticItem);

    queryClient.setQueryData(queryKey, initialData);

    const { result } = renderMutationHook({ mutationFn, getOptimisticData });

    mutateWithName(result.current.mutate, 'New Item');

    await waitFor(() => {
      expect(queryClient.getQueryData(queryKey)).toEqual([
        { id: '1', name: 'Item 1' },
        { id: 'temp', name: 'New Item' },
      ]);
    });

    expect(getOptimisticData).toHaveBeenCalledWith(initialData, {
      name: 'New Item',
    });

    deferred.resolve(responseData);
  });

  it('rolls back cache on error', async () => {
    queryClient.setQueryData(queryKey, initialData);

    const { result } = renderMutationHook({
      mutationFn: vi.fn().mockRejectedValue(new Error('Network error')),
      errorMessage: 'Failed to add item',
    });

    mutateWithName(result.current.mutate, 'New Item');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData(queryKey)).toEqual(initialData);
  });

  it.each([
    {
      name: 'error message from thrown error',
      rejection: new Error('Network error'),
      fallback: 'Failed to update',
      expectedToast: 'Network error',
    },
    {
      name: 'fallback message when error has no message',
      rejection: null,
      fallback: 'Custom fallback error',
      expectedToast: 'Custom fallback error',
    },
  ])('shows $name', async ({ rejection, fallback, expectedToast }) => {
    queryClient.setQueryData(queryKey, initialData);

    const { result } = renderMutationHook({
      mutationFn: vi.fn().mockRejectedValue(rejection),
      getOptimisticData: vi.fn((current) => current ?? []),
      errorMessage: fallback,
    });

    mutateWithName(result.current.mutate, 'Test');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(expectedToast);
  });

  it('calls onSuccess callback on success', async () => {
    queryClient.setQueryData(queryKey, initialData);
    const onSuccess = vi.fn();

    const { result } = renderMutationHook({
      mutationFn: vi.fn().mockResolvedValue(responseData),
      onSuccess,
    });

    mutateWithName(result.current.mutate);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(responseData, { name: 'Item 2' });
  });

  it.each([
    {
      name: 'shows success toast when enabled and message is provided',
      showSuccessToast: true,
      successMessage: 'Item added successfully!',
      expectedToast: 'Item added successfully!',
    },
    {
      name: 'does not show success toast when disabled',
      showSuccessToast: false,
      successMessage: 'Item added successfully!',
      expectedToast: null,
    },
    {
      name: 'does not show success toast when message is missing',
      showSuccessToast: true,
      successMessage: undefined,
      expectedToast: null,
    },
  ])('$name', async ({ showSuccessToast, successMessage, expectedToast }) => {
    queryClient.setQueryData(queryKey, []);

    const { result } = renderMutationHook({
      mutationFn: vi.fn().mockResolvedValue(responseData),
      getOptimisticData: vi.fn((current) => current ?? []),
      showSuccessToast,
      successMessage,
    });

    mutateWithName(result.current.mutate);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    if (expectedToast) {
      expect(toast.success).toHaveBeenCalledWith(expectedToast);
    } else {
      expect(toast.success).not.toHaveBeenCalled();
    }
  });

  it('supports successMessage as a function', async () => {
    queryClient.setQueryData(queryKey, []);
    const successMessageFn = vi.fn(
      (data: Item) => `Created "${data.name}" successfully!`,
    );

    const { result } = renderMutationHook({
      mutationFn: vi.fn().mockResolvedValue(responseData),
      getOptimisticData: vi.fn((current) => current ?? []),
      showSuccessToast: true,
      successMessage: successMessageFn,
    });

    mutateWithName(result.current.mutate);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(successMessageFn).toHaveBeenCalledWith(responseData);
    expect(toast.success).toHaveBeenCalledWith(
      'Created "Item 2" successfully!',
    );
  });
});
