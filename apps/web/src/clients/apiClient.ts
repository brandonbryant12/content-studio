import {
  createBothClients,
  type APIClient,
  type TanstackQueryAPIClient,
} from '@repo/api/client';
import { env } from '@/env';

const { client, queryUtils } = createBothClients({
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});

export const rawApiClient: APIClient = client;
export const apiClient: TanstackQueryAPIClient = queryUtils;
