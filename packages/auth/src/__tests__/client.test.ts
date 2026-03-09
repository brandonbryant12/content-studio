import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthClient } from '../client';

const { createBetterAuthClientMock } = vi.hoisted(() => ({
  createBetterAuthClientMock: vi.fn(),
}));

vi.mock('better-auth/react', () => ({
  createAuthClient: createBetterAuthClientMock,
}));

describe('createAuthClient', () => {
  beforeEach(() => {
    createBetterAuthClientMock.mockReset();
    createBetterAuthClientMock.mockReturnValue({});
  });

  it('uses credentialed auth requests so session reads survive reloads', () => {
    createAuthClient({
      apiBaseUrl: 'https://api.example.com',
      apiBasePath: '/api',
    });

    expect(createBetterAuthClientMock).toHaveBeenCalledTimes(1);
    expect(createBetterAuthClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchOptions: expect.objectContaining({
          credentials: 'include',
        }),
      }),
    );
  });

  it('only forwards signed bearer tokens to auth endpoints', () => {
    createAuthClient({
      apiBaseUrl: 'https://api.example.com',
      apiBasePath: '/api',
      getAccessToken: () => 'not-signed',
    });

    const [{ fetchOptions }] = createBetterAuthClientMock.mock.calls[0] as [
      {
        fetchOptions: {
          auth?: {
            token: () => string | undefined;
          };
        };
      },
    ];

    expect(fetchOptions.auth?.token()).toBeUndefined();
  });
});
