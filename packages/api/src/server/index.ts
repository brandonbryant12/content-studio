import { onError, ORPCError } from '@orpc/client';
import { ValidationError } from '@orpc/contract';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { StrictGetMethodPlugin } from '@orpc/server/plugins';
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from '@orpc/valibot';
import urlJoin from 'url-join';
import * as v from 'valibot';
import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import { createORPCContext, type StorageConfig } from './orpc';
import { appRouter } from './router';

export type { StorageConfig } from './orpc';

// Export effect handler utilities
export {
  handleEffect,
  createCommonErrorHandlers,
  type ErrorMapper,
  type EffectErrors,
  type EffectSuccess,
} from './effect-handler';

export type AppRouter = typeof appRouter;

/**
 * Cleans up stack traces by filtering node_modules and making paths relative
 */
const formatStackTrace = (error: Error): string => {
  if (!error.stack) return error.message;

  const cwd = process.cwd();
  const lines = error.stack.split('\n');
  const messageLine = lines[0];

  const appFrames = lines
    .slice(1)
    .filter((line) => !line.includes('node_modules'))
    .map((line) => line.replace(cwd + '/', '').replace(/file:\/\//, ''))
    .slice(0, 5); // Keep top 5 relevant frames

  if (appFrames.length === 0) {
    // If all frames are from node_modules, show the first few anyway
    return (
      messageLine +
      '\n' +
      lines
        .slice(1, 4)
        .map((line) => line.replace(cwd + '/', '').replace(/file:\/\//, ''))
        .join('\n')
    );
  }

  return messageLine + '\n' + appFrames.join('\n');
};

export const createApi = ({
  auth,
  db,
  serverUrl,
  apiPath,
  geminiApiKey,
  storageConfig,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  serverUrl: string;
  apiPath: `/${string}`;
  geminiApiKey: string;
  storageConfig: StorageConfig;
}) => {
  const handler = new OpenAPIHandler(appRouter, {
    plugins: [
      new StrictGetMethodPlugin(),
      new OpenAPIReferencePlugin({
        docsTitle: 'RT Stack | API Reference',
        docsProvider: 'scalar',
        schemaConverters: [new ValibotToJsonSchemaConverter()],
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
      onError((error) => {
        // Log stack trace for server errors
        if (error instanceof Error) {
          console.error('\t[ERROR]', formatStackTrace(error));
        }

        if (
          error instanceof ORPCError &&
          error.code === 'BAD_REQUEST' &&
          error.cause instanceof ValidationError
        ) {
          const valiIssues = error.cause.issues as [
            v.BaseIssue<unknown>,
            ...v.BaseIssue<unknown>[],
          ];
          console.error(v.flatten(valiIssues));
          throw new ORPCError('INPUT_VALIDATION_FAILED', {
            status: 422,
            message: v.summarize(valiIssues),
            cause: error.cause,
          });
        }
      }),
    ],
  });
  return {
    handler: async (request: Request) => {
      return handler.handle(request, {
        prefix: apiPath,
        context: await createORPCContext({
          db,
          auth,
          headers: request.headers,
          geminiApiKey,
          storageConfig,
        }),
      });
    },
  };
};
