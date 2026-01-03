import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useOptimisticMutation } from '../use-optimistic-mutation';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import the mocked toast for assertions
import { toast } from 'sonner';

describe('useOptimisticMutation', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('optimistic updates', () => {
    it('applies optimistic update to cache on mutate', async () => {
      const queryKey = ['items'];
      const initialData = [{ id: '1', name: 'Item 1' }];

      // Set initial cache data
      queryClient.setQueryData(queryKey, initialData);

      const mutationFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: '2', name: 'Item 2' }), 100))
      );

      const getOptimisticData = vi.fn().mockImplementation(
        (current: typeof initialData | undefined, variables: { name: string }) => {
          return [...(current ?? []), { id: 'temp', name: variables.name }];
        }
      );

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
          }),
        { wrapper: createWrapper() }
      );

      // Trigger the mutation
      act(() => {
        result.current.mutate({ name: 'New Item' });
      });

      // Check cache was optimistically updated
      await waitFor(() => {
        const cacheData = queryClient.getQueryData(queryKey);
        expect(cacheData).toEqual([
          { id: '1', name: 'Item 1' },
          { id: 'temp', name: 'New Item' },
        ]);
      });

      expect(getOptimisticData).toHaveBeenCalledWith(initialData, { name: 'New Item' });
    });
  });

  describe('error handling', () => {
    it('rolls back on error', async () => {
      const queryKey = ['items'];
      const initialData = [{ id: '1', name: 'Item 1' }];

      // Set initial cache data
      queryClient.setQueryData(queryKey, initialData);

      const mutationFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const getOptimisticData = vi.fn().mockImplementation(
        (current: typeof initialData | undefined, variables: { name: string }) => {
          return [...(current ?? []), { id: 'temp', name: variables.name }];
        }
      );

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            errorMessage: 'Failed to add item',
          }),
        { wrapper: createWrapper() }
      );

      // Trigger the mutation
      act(() => {
        result.current.mutate({ name: 'New Item' });
      });

      // Wait for the error to be handled
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Cache should be rolled back to initial data
      const cacheData = queryClient.getQueryData(queryKey);
      expect(cacheData).toEqual(initialData);
    });

    it('shows error toast on failure', async () => {
      const queryKey = ['items'];
      const initialData = [{ id: '1', name: 'Item 1' }];

      queryClient.setQueryData(queryKey, initialData);

      const mutationFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const getOptimisticData = vi.fn().mockImplementation(
        (current: typeof initialData | undefined) => current
      );

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            errorMessage: 'Failed to update',
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({ name: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Error toast should be shown with the error message
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });

    it('shows fallback error message when error has no message', async () => {
      const queryKey = ['items'];

      queryClient.setQueryData(queryKey, []);

      const mutationFn = vi.fn().mockRejectedValue(null);

      const getOptimisticData = vi.fn().mockReturnValue([]);

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            errorMessage: 'Custom fallback error',
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({});
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Custom fallback error');
    });
  });

  describe('success handling', () => {
    it('calls onSuccess callback on success', async () => {
      const queryKey = ['items'];
      const initialData = [{ id: '1', name: 'Item 1' }];
      const responseData = { id: '2', name: 'Item 2' };

      queryClient.setQueryData(queryKey, initialData);

      const mutationFn = vi.fn().mockResolvedValue(responseData);

      const getOptimisticData = vi.fn().mockImplementation(
        (current: typeof initialData | undefined, variables: { name: string }) => {
          return [...(current ?? []), { id: 'temp', name: variables.name }];
        }
      );

      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({ name: 'Item 2' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(responseData, { name: 'Item 2' });
    });

    it('shows success toast when showSuccessToast=true and successMessage provided', async () => {
      const queryKey = ['items'];
      const responseData = { id: '2', name: 'Item 2' };

      queryClient.setQueryData(queryKey, []);

      const mutationFn = vi.fn().mockResolvedValue(responseData);
      const getOptimisticData = vi.fn().mockReturnValue([]);

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            successMessage: 'Item added successfully!',
            showSuccessToast: true,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({ name: 'Item 2' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Item added successfully!');
    });

    it('does not show success toast when showSuccessToast=false', async () => {
      const queryKey = ['items'];
      const responseData = { id: '2', name: 'Item 2' };

      queryClient.setQueryData(queryKey, []);

      const mutationFn = vi.fn().mockResolvedValue(responseData);
      const getOptimisticData = vi.fn().mockReturnValue([]);

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            successMessage: 'Item added successfully!',
            showSuccessToast: false,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({ name: 'Item 2' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('does not show success toast when successMessage not provided', async () => {
      const queryKey = ['items'];
      const responseData = { id: '2', name: 'Item 2' };

      queryClient.setQueryData(queryKey, []);

      const mutationFn = vi.fn().mockResolvedValue(responseData);
      const getOptimisticData = vi.fn().mockReturnValue([]);

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            showSuccessToast: true,
            // No successMessage provided
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({ name: 'Item 2' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('successMessage can be a function', async () => {
      const queryKey = ['items'];
      const responseData = { id: '2', name: 'Item 2' };

      queryClient.setQueryData(queryKey, []);

      const mutationFn = vi.fn().mockResolvedValue(responseData);
      const getOptimisticData = vi.fn().mockReturnValue([]);

      const successMessageFn = vi.fn().mockImplementation(
        (data: typeof responseData) => `Created "${data.name}" successfully!`
      );

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            queryKey,
            mutationFn,
            getOptimisticData,
            successMessage: successMessageFn,
            showSuccessToast: true,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({ name: 'Item 2' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(successMessageFn).toHaveBeenCalledWith(responseData);
      expect(toast.success).toHaveBeenCalledWith('Created "Item 2" successfully!');
    });
  });
});
