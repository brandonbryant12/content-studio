import { createAuthClient as createBetterAuthClient } from 'better-auth/react';
import urlJoin from 'url-join';

export interface AuthClientOptions {
  apiBaseUrl: string;
  apiBasePath: string;
  getAccessToken?: () => string | null | undefined;
  onAccessToken?: (token: string | null) => void;
}

const getSignedBearerToken = (
  token: string | null | undefined,
): string | undefined => {
  if (!token) return undefined;
  return token.includes('.') ? token : undefined;
};

export const createAuthClient = ({
  apiBaseUrl,
  apiBasePath,
  getAccessToken,
  onAccessToken,
}: AuthClientOptions) =>
  createBetterAuthClient({
    baseURL: urlJoin(apiBaseUrl, apiBasePath, 'auth'),
    fetchOptions: {
      auth: getAccessToken
        ? {
            type: 'Bearer',
            token: () => getSignedBearerToken(getAccessToken()),
          }
        : undefined,
      onSuccess: (context) => {
        if (!onAccessToken) return;
        const nextToken = context.response.headers.get('set-auth-token');
        if (nextToken) {
          onAccessToken(nextToken);
        }
      },
      onError: (context) => {
        if (!onAccessToken) return;
        if (context.response?.status === 401) {
          onAccessToken(null);
        }
      },
    },
  });
