import { onError } from '@orpc/client';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { StrictGetMethodPlugin } from '@orpc/server/plugins';
import urlJoin from 'url-join';
import type { ServerRuntime } from './runtime';
import type { AuthInstance } from '@repo/auth/server';
import { ProductBranding } from './constants';
import { handleORPCError } from './effect-handler';
import { createORPCContext } from './orpc';
import { appRouter } from './router';

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
  handleEffectWithProtocol,
  handleTaggedError,
  handleORPCError,
  type ErrorFactory,
  type HandleEffectOptions,
  type CustomErrorHandler,
  type EffectErrors,
  type EffectSuccess,
} from './effect-handler';

// Export SSE publisher and lifecycle helpers
export {
  ssePublisher,
  publishSSEEvent,
  subscribeToSSEEvents,
  configureSSEPublisher,
  pingSSEPublisher,
  shutdownSSEPublisher,
} from './publisher';

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
        docsTitle: ProductBranding.API_REFERENCE_TITLE,
        docsProvider: 'scalar',
        specGenerateOptions: {
          info: {
            title: ProductBranding.API_NAME,
            version: '1.0.0',
          },
          servers: [{ url: urlJoin(serverUrl, apiPath) }],
        },
      }),
    ],
    clientInterceptors: [onError((error) => handleORPCError(error))],
  });
  return {
    handler: async (request: Request, requestId: string) => {
      return handler.handle(request, {
        prefix: apiPath,
        context: await createORPCContext({
          runtime: serverRuntime,
          auth,
          headers: request.headers,
          requestId,
        }),
      });
    },
  };
};
