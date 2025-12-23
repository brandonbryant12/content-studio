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

// Export storage factory for worker reuse
export { createStorageLayer } from './storage-factory';

// Export effect handler utilities
export {
  handleEffect,
  createErrorHandlers,
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
  useMockAI = false,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  serverUrl: string;
  apiPath: `/${string}`;
  geminiApiKey: string;
  storageConfig: StorageConfig;
  useMockAI?: boolean;
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

        // Handle input validation errors (BAD_REQUEST)
        if (
          error instanceof ORPCError &&
          error.code === 'BAD_REQUEST' &&
          error.cause instanceof ValidationError
        ) {
          const valiIssues = error.cause.issues as [
            v.BaseIssue<unknown>,
            ...v.BaseIssue<unknown>[],
          ];
          console.error('[INPUT_VALIDATION]', v.flatten(valiIssues));
          throw new ORPCError('INPUT_VALIDATION_FAILED', {
            status: 422,
            message: v.summarize(valiIssues),
            cause: error.cause,
          });
        }

        // Handle output validation errors (INTERNAL_SERVER_ERROR)
        // These indicate a bug in the API - response doesn't match contract
        if (
          error instanceof ORPCError &&
          error.code === 'INTERNAL_SERVER_ERROR' &&
          error.cause instanceof ValidationError
        ) {
          const valiIssues = error.cause.issues as [
            v.BaseIssue<unknown>,
            ...v.BaseIssue<unknown>[],
          ];
          console.error(
            '[OUTPUT_VALIDATION] Response does not match contract:',
          );
          console.error(
            '  Issues:',
            JSON.stringify(v.flatten(valiIssues), null, 2),
          );
          // Log the actual data that failed validation (helpful for debugging)
          if (error.cause.data !== undefined) {
            console.error(
              '  Data:',
              JSON.stringify(error.cause.data, null, 2).slice(0, 1000),
            );
          }
          // Re-throw with the same code but better message for debugging
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            status: 500,
            message: `Output validation failed: ${v.summarize(valiIssues)}`,
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
          useMockAI,
        }),
      });
    },
  };
};
