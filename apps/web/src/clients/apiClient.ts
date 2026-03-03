import {
  createBothClients,
  type APIClient,
  type TanstackQueryAPIClient,
} from '@repo/api/client';
import { refreshAccessToken } from '@/clients/authClient';
import { env } from '@/env';
import { getAuthToken } from '@/shared/lib/auth-token';

const { client, queryUtils } = createBothClients({
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  getAccessToken: getAuthToken,
  refreshAccessToken: refreshAccessToken,
});

export const rawApiClient: APIClient = client;
export const apiClient: TanstackQueryAPIClient = queryUtils;
