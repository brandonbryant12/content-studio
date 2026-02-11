import { ORPCError } from '@orpc/client';
import { ManagedRuntime, type Layer } from 'effect';
import type { ORPCContext, AuthenticatedORPCContext } from '../../orpc';
import type { ServerRuntime } from '../../runtime';
import type { User } from '@repo/auth/policy';

/**
 * Session type for testing - matches AuthInstance['$Infer']['Session']
 */
interface TestSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Create a mock session from a User for testing.
 *
 * @example
 * ```typescript
 * const user = createTestUser();
 * const session = createMockSession(user);
 * const context = createMockContext(runtime, user);
 * ```
 */
export const createMockSession = (user: User): TestSession => ({
  session: {
    id: `session_${user.id}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
    updatedAt: new Date(),
    token: `token_${user.id}`,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  },
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});

/**
 * Create a mock oRPC context for testing handlers.
 *
 * When user is provided, returns AuthenticatedORPCContext with session and user.
 * When user is null, returns ORPCContext with null session/user for testing unauthorized access.
 *
 * @example
 * ```typescript
 * // Authenticated context
 * const user = createTestUser();
 * const context = createMockContext(runtime, user);
 *
 * // Unauthenticated context (for testing unauthorized)
 * const context = createMockContext(runtime, null);
 * ```
 */
export function createMockContext(
  runtime: ServerRuntime,
  user: User,
): AuthenticatedORPCContext;
export function createMockContext(
  runtime: ServerRuntime,
  user: null,
): ORPCContext;
export function createMockContext(
  runtime: ServerRuntime,
  user: User | null,
): ORPCContext | AuthenticatedORPCContext {
  if (user === null) {
    return {
      session: null,
      user: null,
      runtime,
    };
  }

  return {
    session: createMockSession(user),
    user,
    runtime,
  } as AuthenticatedORPCContext;
}

/**
 * Error codes used by the document router and common across the API.
 */
export type ErrorCode =
  | 'DOCUMENT_NOT_FOUND'
  | 'DOCUMENT_TOO_LARGE'
  | 'DOCUMENT_PARSE_ERROR'
  | 'UNSUPPORTED_FORMAT'
  | 'VOICE_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMITED';

/**
 * Error factory interface matching oRPC handler errors.
 */
export interface MockErrorFactory {
  DOCUMENT_NOT_FOUND: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  DOCUMENT_TOO_LARGE: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  DOCUMENT_PARSE_ERROR: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  UNSUPPORTED_FORMAT: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  VOICE_NOT_FOUND: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  UNAUTHORIZED: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  FORBIDDEN: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  NOT_FOUND: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  INTERNAL_ERROR: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  CONFLICT: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  BAD_REQUEST: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  SERVICE_UNAVAILABLE: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  RATE_LIMITED: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
}

/**
 * HTTP status codes for each error type.
 */
const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  DOCUMENT_NOT_FOUND: 404,
  DOCUMENT_TOO_LARGE: 413,
  DOCUMENT_PARSE_ERROR: 422,
  UNSUPPORTED_FORMAT: 415,
  VOICE_NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  CONFLICT: 409,
  BAD_REQUEST: 400,
  SERVICE_UNAVAILABLE: 502,
  RATE_LIMITED: 429,
};

/**
 * Create a mock error factory for testing oRPC handlers.
 *
 * Returns factories for all error codes used by the document router.
 * Each factory creates an ORPCError that can be caught and inspected in tests.
 *
 * @example
 * ```typescript
 * const errors = createMockErrors();
 *
 * // In handler test
 * await expect(
 *   documentRouter.get({ context, input, errors })
 * ).rejects.toThrow(ORPCError);
 *
 * // Inspecting error details
 * try {
 *   await documentRouter.get({ context, input, errors });
 * } catch (error) {
 *   expect(error).toBeInstanceOf(ORPCError);
 *   expect((error as ORPCError).code).toBe('DOCUMENT_NOT_FOUND');
 * }
 * ```
 */
export const createMockErrors = (): MockErrorFactory => {
  const createErrorFactory =
    (code: ErrorCode) =>
    (opts: { message: string; data?: unknown }): ORPCError<string, unknown> =>
      new ORPCError(code, {
        status: ERROR_STATUS_CODES[code],
        message: opts.message,
        data: opts.data,
      });

  return {
    DOCUMENT_NOT_FOUND: createErrorFactory('DOCUMENT_NOT_FOUND'),
    DOCUMENT_TOO_LARGE: createErrorFactory('DOCUMENT_TOO_LARGE'),
    DOCUMENT_PARSE_ERROR: createErrorFactory('DOCUMENT_PARSE_ERROR'),
    UNSUPPORTED_FORMAT: createErrorFactory('UNSUPPORTED_FORMAT'),
    VOICE_NOT_FOUND: createErrorFactory('VOICE_NOT_FOUND'),
    UNAUTHORIZED: createErrorFactory('UNAUTHORIZED'),
    FORBIDDEN: createErrorFactory('FORBIDDEN'),
    NOT_FOUND: createErrorFactory('NOT_FOUND'),
    INTERNAL_ERROR: createErrorFactory('INTERNAL_ERROR'),
    CONFLICT: createErrorFactory('CONFLICT'),
    BAD_REQUEST: createErrorFactory('BAD_REQUEST'),
    SERVICE_UNAVAILABLE: createErrorFactory('SERVICE_UNAVAILABLE'),
    RATE_LIMITED: createErrorFactory('RATE_LIMITED'),
  };
};

/**
 * Helper to assert an error is an ORPCError with a specific code.
 *
 * @example
 * ```typescript
 * try {
 *   await documentRouter.get({ context, input, errors });
 *   fail('Expected error to be thrown');
 * } catch (error) {
 *   assertORPCError(error, 'DOCUMENT_NOT_FOUND');
 * }
 * ```
 */
export const assertORPCError = (
  error: unknown,
  expectedCode: ErrorCode,
): asserts error is ORPCError<string, unknown> => {
  if (!(error instanceof ORPCError)) {
    throw new Error(`Expected ORPCError but got ${typeof error}: ${error}`);
  }
  if (error.code !== expectedCode) {
    throw new Error(
      `Expected error code '${expectedCode}' but got '${error.code}'`,
    );
  }
};

/**
 * Create a test server runtime from a set of layers.
 *
 * Test runtimes intentionally provide a subset of SharedServices
 * (only what the specific test needs). This helper centralizes the
 * type bridge so individual tests don't need `as any`.
 */
export const createTestServerRuntime = <R>(
  layers: Layer.Layer<R>,
): ServerRuntime => ManagedRuntime.make(layers) as unknown as ServerRuntime;

/**
 * Re-export ORPCError for convenient access in tests.
 */
export { ORPCError };
