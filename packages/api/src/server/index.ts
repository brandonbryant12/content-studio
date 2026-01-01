import { onError, ORPCError } from '@orpc/client';
import { ValidationError } from '@orpc/contract';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { StrictGetMethodPlugin } from '@orpc/server/plugins';
import urlJoin from 'url-join';
import type { AuthInstance } from '@repo/auth/server';
import { createORPCContext } from './orpc';
import { appRouter } from './router';
import type { ServerRuntime } from './runtime';

/** Helper to extract cause from ORPCError since TypeScript doesn't type it */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getErrorCause(error: ORPCError<any, any>): unknown {
  return (error as Error & { cause?: unknown }).cause;
}

/**
 * Standard Schema issue type (common format for Effect Schema, Zod, Valibot, etc.)
 */
interface StandardSchemaIssue {
  message: string;
  path?: Array<{ key: string | number | symbol }>;
}

/**
 * Format validation issues from Standard Schema format to a readable summary.
 */
const formatValidationIssues = (
  issues: readonly StandardSchemaIssue[],
): string => {
  return issues
    .map((issue) => {
      const path = issue.path?.map((p) => String(p.key)).join('.') || 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
};

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
  createErrorHandlers,
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
      onError((error) => {
        // Log stack trace for server errors
        if (error instanceof Error) {
          console.error('\t[ERROR]', formatStackTrace(error));
        }

        // Handle input validation errors (BAD_REQUEST)
        if (error instanceof ORPCError && error.code === 'BAD_REQUEST') {
          const cause = getErrorCause(error);
          if (cause instanceof ValidationError) {
            const issues = cause.issues as readonly StandardSchemaIssue[];
            const summary = formatValidationIssues(issues);
            console.error('[INPUT_VALIDATION]', summary);
            throw new ORPCError('INPUT_VALIDATION_FAILED', {
              status: 422,
              message: summary,
              cause,
            });
          }
        }

        // Handle output validation errors (INTERNAL_SERVER_ERROR)
        // These indicate a bug in the API - response doesn't match contract
        if (error instanceof ORPCError && error.code === 'INTERNAL_SERVER_ERROR') {
          const cause = getErrorCause(error);
          if (cause instanceof ValidationError) {
            const issues = cause.issues as readonly StandardSchemaIssue[];
            const summary = formatValidationIssues(issues);
            console.error(
              '[OUTPUT_VALIDATION] Response does not match contract:',
            );
            console.error('  Issues:', summary);
            // Log the actual data that failed validation (helpful for debugging)
            if (cause.data !== undefined) {
              console.error(
                '  Data:',
                JSON.stringify(cause.data, null, 2).slice(0, 1000),
              );
            }
            // Re-throw with the same code but better message for debugging
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              status: 500,
              message: `Output validation failed: ${summary}`,
              cause,
            });
          }
        }
      }),
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
