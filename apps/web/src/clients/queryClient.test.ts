import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from './queryClient';
import { getErrorMessage } from '@/shared/lib/errors';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/shared/lib/errors', () => ({
  getErrorMessage: vi.fn(() => 'formatted-error'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const getRetry = () => {
  const retry = queryClient.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') {
    throw new Error('Expected query retry strategy to be a function');
  }
  return retry;
};

describe('queryClient retry policy', () => {
  it('does not retry NOT_FOUND class API errors', () => {
    const retry = getRetry();
    const notFound = { code: 'NOT_FOUND' } as Error & { code: string };
    const documentNotFound = {
      code: 'DOCUMENT_NOT_FOUND',
    } as Error & { code: string };

    expect(retry(1, notFound)).toBe(false);
    expect(retry(1, documentNotFound)).toBe(false);
  });

  it('retries transient errors up to the retry cap', () => {
    const retry = getRetry();
    expect(retry(1, new Error('timeout'))).toBe(true);
    expect(retry(3, new Error('timeout'))).toBe(false);
  });
});

describe('queryClient mutation fallback errors', () => {
  it('shows a fallback toast when mutation has no onError handler', async () => {
    const error = new Error('boom');
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => {
        throw error;
      },
    });

    await expect(mutation.execute(undefined)).rejects.toThrow('boom');

    expect(getErrorMessage).toHaveBeenCalledWith(error, 'Operation failed');
    expect(toast.error).toHaveBeenCalledWith('formatted-error');
  });

  it('does not show fallback toast when mutation defines onError', async () => {
    const error = new Error('boom');
    const localOnError = vi.fn();
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => {
        throw error;
      },
      onError: localOnError,
    });

    await expect(mutation.execute(undefined)).rejects.toThrow('boom');

    expect(localOnError).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
