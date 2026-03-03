import { createORPCClient } from '@orpc/client';
import { ResponseValidationPlugin } from '@orpc/contract/plugins';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import urlJoin from 'url-join';
import type {
  ContractRouterClient,
  InferContractRouterOutputs,
} from '@orpc/contract';
import { appContract } from '../contracts';

export { isDefinedError, safe } from '@orpc/client';
export { eventIteratorToUnproxiedDataStream } from '@orpc/client';
export { getEventMeta } from '@orpc/server';

export interface APIClientOptions {
  serverUrl: string;
  apiPath: `/${string}`;
  getAccessToken?: () => string | null | undefined;
  refreshAccessToken?: () => Promise<boolean>;
}

// Oddly, this is needed for better-auth to not complain
export type { AppRouter } from '../server';

export type AppContract = typeof appContract;
export type APIClient = ContractRouterClient<AppContract>;
export type RouterOutput = InferContractRouterOutputs<AppContract>;
export type TanstackQueryAPIClient = ReturnType<
  typeof createTanstackQueryUtils<APIClient>
>;

const getSignedBearerToken = (
  token: string | null | undefined,
): string | null => {
  if (!token) return null;
  return token.includes('.') ? token : null;
};

export const createAPIClient = ({
  serverUrl,
  apiPath,
  getAccessToken,
  refreshAccessToken,
}: APIClientOptions): APIClient =>
  createORPCClient(
    new OpenAPILink(appContract, {
      url: urlJoin(serverUrl, apiPath),
      plugins: [new ResponseValidationPlugin(appContract)],
      fetch: async (request, init) => {
        const requestWithAuth = () => {
          const token = getSignedBearerToken(getAccessToken?.() ?? null);
          const outgoingRequest = new Request(request, init);
          const headers = new Headers(outgoingRequest.headers);
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          } else {
            headers.delete('Authorization');
          }

          return globalThis.fetch(outgoingRequest, {
            headers,
            credentials: token ? 'omit' : 'include',
          });
        };

        let response = await requestWithAuth();
        if (
          response.status === 401 &&
          getAccessToken?.() &&
          refreshAccessToken &&
          (await refreshAccessToken())
        ) {
          response = await requestWithAuth();
        }

        return response;
      },
    }),
  );

export const createTanstackQueryAPIClient = (
  opts: APIClientOptions,
): TanstackQueryAPIClient => {
  const apiClient = createAPIClient(opts);
  return createTanstackQueryUtils(apiClient);
};

export const createBothClients = (opts: APIClientOptions) => {
  const client = createAPIClient(opts);
  const queryUtils = createTanstackQueryUtils(client);
  return { client, queryUtils };
};
