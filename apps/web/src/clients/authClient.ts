import { createAuthClient } from '@repo/auth/client';
import urlJoin from 'url-join';
import { env } from '@/env';
import {
  applyAuthToken,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '@/shared/lib/auth-token';

export const authClient = createAuthClient({
  apiBaseUrl: env.PUBLIC_SERVER_URL,
  apiBasePath: env.PUBLIC_SERVER_API_PATH,
  getAccessToken: getAuthToken,
  onAccessToken: applyAuthToken,
});

const accessTokenEndpoint = urlJoin(
  env.PUBLIC_SERVER_URL,
  env.PUBLIC_SERVER_API_PATH,
  'auth',
  'access-token',
);

export const refreshAccessToken = async (): Promise<boolean> => {
  const response = await globalThis.fetch(accessTokenEndpoint, {
    method: 'GET',
    credentials: 'include',
  });

  if (response.status === 401) {
    clearAuthToken();
    return false;
  }

  if (!response.ok) {
    return false;
  }

  const nextToken = response.headers.get('set-auth-token');
  if (!nextToken) {
    clearAuthToken();
    return false;
  }

  if (!nextToken.includes('.')) {
    clearAuthToken();
    return false;
  }

  setAuthToken(nextToken);
  return true;
};

export type AuthSession =
  | ReturnType<typeof createAuthClient>['$Infer']['Session']
  | null;
