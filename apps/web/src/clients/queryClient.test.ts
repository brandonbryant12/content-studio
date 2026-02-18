import { describe, expect, it } from 'vitest';
import { queryClient } from './queryClient';

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
