import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthenticatedFetch } from './index';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn<typeof fetch>(),
}));

vi.stubGlobal('fetch', fetchMock);

describe('createAuthenticatedFetch', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('retries a 401 after rehydrating auth even when no token is in memory', async () => {
    let token: string | null = null;
    const refreshAccessToken = vi.fn(async () => {
      token = 'signed.jwt.token';
      return true;
    });

    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const authenticatedFetch = createAuthenticatedFetch({
      getAccessToken: () => token,
      refreshAccessToken,
    });

    const response = await authenticatedFetch(
      new Request('https://api.example.com/protected'),
    );

    expect(response.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstHeaders = new Headers(
      fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit,
    );
    const secondHeaders = new Headers(
      fetchMock.mock.calls[1]?.[1]?.headers as HeadersInit,
    );

    expect(firstHeaders.get('Authorization')).toBeNull();
    expect(secondHeaders.get('Authorization')).toBe('Bearer signed.jwt.token');
    expect(fetchMock.mock.calls[1]?.[1]?.credentials).toBe('omit');
  });
});
