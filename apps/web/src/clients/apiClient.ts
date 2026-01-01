import { createTanstackQueryAPIClient, type TanstackQueryAPIClient } from '@repo/api/client';
import { env } from '@/env';

export const apiClient: TanstackQueryAPIClient = createTanstackQueryAPIClient({
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});
