import { createAuthClient } from '@repo/auth/client';
import { env } from '@/env';
import {
  applyAuthToken,
  clearAuthToken,
  getAuthToken,
} from '@/shared/lib/auth-token';

export const authClient = createAuthClient({
  apiBaseUrl: env.PUBLIC_SERVER_URL,
  apiBasePath: env.PUBLIC_SERVER_API_PATH,
  getAccessToken: getAuthToken,
  onAccessToken: applyAuthToken,
});

const isUnauthorizedAuthError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;

  return status === 401 || code === 'UNAUTHORIZED';
};

export const refreshAccessToken = async (): Promise<boolean> => {
  const session = await authClient.getSession();

  if (!session.error && session.data?.user) {
    return true;
  }

  if (!session.error) {
    clearAuthToken();
    return false;
  }

  if (isUnauthorizedAuthError(session.error)) {
    clearAuthToken();
  }

  return false;
};

export type AuthSession =
  | ReturnType<typeof createAuthClient>['$Infer']['Session']
  | null;
