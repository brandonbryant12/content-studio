import {
  QueryClient,
  QueryClientProvider,
  type MutationFunctionContext,
} from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBulkDelete } from '../use-bulk-delete';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useBulkDelete', () => {
  let queryClient: QueryClient;

  const queryKey = ['items'];
  const initialData = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C' },
  ];

  const createWrapper = () => {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    };
  };

  const renderUseBulkDelete = (
    deleteFn: (
      input: { id: string },
      context: MutationFunctionContext,
    ) => Promise<unknown>,
  ) =>
    renderHook(
      () =>
        useBulkDelete({
          queryKey,
          deleteFn,
          entityName: 'document',
        }),
      { wrapper: createWrapper() },
    );

  const execute = async (
    result: { current: ReturnType<typeof useBulkDelete> },
    ids: string[],
  ) => {
    await act(async () => {
      await result.current.executeBulkDelete(new Set(ids));
    });
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(queryKey, initialData);
    vi.clearAllMocks();
  });

  it('removes selected items and shows success toast when all deletes succeed', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderUseBulkDelete(deleteFn);

    await execute(result, ['a', 'b']);

    expect(deleteFn).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(queryKey)).toEqual([
      { id: 'c', title: 'C' },
    ]);
    expect(toast.success).toHaveBeenCalledWith('Deleted 2 documents');
    expect(result.current.isBulkDeleting).toBe(false);
  });

  it.each([
    {
      name: 'promise rejection',
      deleteFn: ({ id }: { id: string }) =>
        id === 'b' ? Promise.reject(new Error('boom')) : Promise.resolve(),
      expectedIds: ['b', 'c'],
    },
    {
      name: 'sync throw',
      deleteFn: ({ id }: { id: string }) => {
        if (id === 'a') {
          throw new Error('sync failure');
        }
        return Promise.resolve();
      },
      expectedIds: ['a', 'c'],
    },
  ])(
    'restores failed items for per-item failures ($name)',
    async ({ deleteFn, expectedIds }) => {
      const mockedDeleteFn = vi.fn(deleteFn);
      const { result } = renderUseBulkDelete(mockedDeleteFn);

      await act(async () => {
        await expect(
          result.current.executeBulkDelete(new Set(['a', 'b'])),
        ).resolves.toBeUndefined();
      });

      expect(queryClient.getQueryData(queryKey)).toEqual(
        initialData.filter((item) => expectedIds.includes(item.id)),
      );
      expect(toast.error).toHaveBeenCalledWith('Failed to delete 1 document');
      expect(toast.success).not.toHaveBeenCalled();
      expect(result.current.isBulkDeleting).toBe(false);
    },
  );

  it('handles unexpected failures, preserves cache, and resets loading state', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(queryClient, 'cancelQueries').mockRejectedValue(
      new Error('cancel failed'),
    );

    const { result } = renderUseBulkDelete(deleteFn);

    await act(async () => {
      await expect(
        result.current.executeBulkDelete(new Set(['a', 'b'])),
      ).resolves.toBeUndefined();
    });

    expect(deleteFn).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKey)).toEqual(initialData);
    expect(toast.error).toHaveBeenCalledWith('Failed to delete documents');
    expect(result.current.isBulkDeleting).toBe(false);
  });
});
