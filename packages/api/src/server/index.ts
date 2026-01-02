import { Effect } from 'effect';
import { onError } from '@orpc/client';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { StrictGetMethodPlugin } from '@orpc/server/plugins';
import urlJoin from 'url-join';
import type { AuthInstance } from '@repo/auth/server';
import { handleORPCError } from './effect-handler';
import { createORPCContext } from './orpc';
import { appRouter } from './router';
import type { ServerRuntime } from './runtime';

export type { StorageConfig } from './orpc';

// Export runtime types and factory
export {
  createServerRuntime,
  createSharedLayers,
  type ServerRuntime,
  type ServerRuntimeConfig,
  type SharedServices,
} from './runtime';

// Export storage factory for worker reuse
export { createStorageLayer } from './storage-factory';

// Export effect handler utilities
export {
  handleEffect,
  handleORPCError,
  createErrorHandlers,
  type ErrorMapper,
  type EffectErrors,
  type EffectSuccess,
} from './effect-handler';

export type AppRouter = typeof appRouter;

export const createApi = ({
  auth,
  serverRuntime,
  serverUrl,
  apiPath,
}: {
  auth: AuthInstance;
  serverRuntime: ServerRuntime;
  serverUrl: string;
  apiPath: `/${string}`;
}) => {
  const handler = new OpenAPIHandler(appRouter, {
    plugins: [
      new StrictGetMethodPlugin(),
      new OpenAPIReferencePlugin({
        docsTitle: 'RT Stack | API Reference',
        docsProvider: 'scalar',
        specGenerateOptions: {
          info: {
            title: 'RT Stack API',
            version: '1.0.0',
          },
          servers: [{ url: urlJoin(serverUrl, apiPath) }],
        },
      }),
    ],
    clientInterceptors: [
      onError((error) => Effect.runSync(handleORPCError(error))),
    ],
  });
  return {
    handler: async (request: Request) => {
      return handler.handle(request, {
        prefix: apiPath,
        context: await createORPCContext({
          runtime: serverRuntime,
          auth,
          headers: request.headers,
        }),
      });
    },
  };
};
