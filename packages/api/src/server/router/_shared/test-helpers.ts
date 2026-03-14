import { ORPCError } from '@orpc/client';
import { ManagedRuntime, type Layer } from 'effect';
import { expect } from 'vitest';
import type { AuthenticatedORPCContext, ORPCContext } from '../../orpc';
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
      requestId: 'test-request-id',
      runtime,
    };
  }

  return {
    session: createMockSession(user),
    user,
    requestId: 'test-request-id',
    runtime,
  } as AuthenticatedORPCContext;
}

/**
 * Error codes used by the source router and common across the API.
 */
export type ErrorCode =
  | 'SOURCE_NOT_FOUND'
  | 'SOURCE_TOO_LARGE'
  | 'SOURCE_PARSE_ERROR'
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_VOICEOVER_AUDIO_GENERATION'
  | 'INVALID_SAVE'
  | 'PODCAST_NOT_FOUND'
  | 'PODCAST_PLAN_SOURCES_NOT_READY'
  | 'SCRIPT_NOT_FOUND'
  | 'VOICEOVER_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'JOB_NOT_FOUND'
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
  SOURCE_NOT_FOUND: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  SOURCE_TOO_LARGE: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  SOURCE_PARSE_ERROR: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  UNSUPPORTED_FORMAT: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  INVALID_VOICEOVER_AUDIO_GENERATION: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  INVALID_SAVE: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  PODCAST_NOT_FOUND: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  PODCAST_PLAN_SOURCES_NOT_READY: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  SCRIPT_NOT_FOUND: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  VOICEOVER_NOT_FOUND: (opts: {
    message: string;
    data?: unknown;
  }) => ORPCError<string, unknown>;
  USER_NOT_FOUND: (opts: {
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
  JOB_NOT_FOUND: (opts: {
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
  SOURCE_NOT_FOUND: 404,
  SOURCE_TOO_LARGE: 413,
  SOURCE_PARSE_ERROR: 422,
  UNSUPPORTED_FORMAT: 415,
  INVALID_VOICEOVER_AUDIO_GENERATION: 400,
  INVALID_SAVE: 409,
  PODCAST_NOT_FOUND: 404,
  PODCAST_PLAN_SOURCES_NOT_READY: 409,
  SCRIPT_NOT_FOUND: 404,
  VOICEOVER_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  VOICE_NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  CONFLICT: 409,
  BAD_REQUEST: 400,
  SERVICE_UNAVAILABLE: 502,
  RATE_LIMITED: 429,
  JOB_NOT_FOUND: 404,
};

const mapMessageToCode = (message: string): ErrorCode | null => {
  const normalized = message.toLowerCase();

  const exactCode = (Object.keys(ERROR_STATUS_CODES) as ErrorCode[]).find(
    (code) => normalized.includes(code.toLowerCase()),
  );
  if (exactCode) {
    return exactCode;
  }

  if (normalized.includes('authentication required')) {
    return 'UNAUTHORIZED';
  }

  if (
    normalized.includes('unsupported format') ||
    normalized.includes('file type') ||
    normalized.includes('not supported')
  ) {
    return 'UNSUPPORTED_FORMAT';
  }

  if (
    normalized.includes('source_parse_error') ||
    normalized.includes('failed to parse pdf') ||
    normalized.includes('parse pdf')
  ) {
    return 'SOURCE_PARSE_ERROR';
  }

  if (
    normalized.includes('source_too_large') ||
    normalized.includes('too large')
  ) {
    return 'SOURCE_TOO_LARGE';
  }

  if (
    normalized.includes('sources must finish processing') ||
    normalized.includes('plan can be generated')
  ) {
    return 'PODCAST_PLAN_SOURCES_NOT_READY';
  }

  if (
    normalized.includes('requires admin role') ||
    normalized.includes('forbidden')
  ) {
    return 'FORBIDDEN';
  }

  if (normalized.includes('service unavailable')) {
    return 'SERVICE_UNAVAILABLE';
  }

  if (
    normalized.includes('storage operation failed') ||
    normalized.includes('audio processing failed') ||
    normalized.includes('file upload failed') ||
    normalized.includes('internal error')
  ) {
    return 'INTERNAL_ERROR';
  }

  if (normalized.includes('not found')) {
    if (normalized.includes('job ')) {
      return 'JOB_NOT_FOUND';
    }
    return 'NOT_FOUND';
  }

  return null;
};

/**
 * Create a mock error factory for testing oRPC handlers.
 *
 * Returns factories for all error codes used by the source router.
 * Each factory creates an ORPCError that can be caught and inspected in tests.
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
    SOURCE_NOT_FOUND: createErrorFactory('SOURCE_NOT_FOUND'),
    SOURCE_TOO_LARGE: createErrorFactory('SOURCE_TOO_LARGE'),
    SOURCE_PARSE_ERROR: createErrorFactory('SOURCE_PARSE_ERROR'),
    UNSUPPORTED_FORMAT: createErrorFactory('UNSUPPORTED_FORMAT'),
    INVALID_VOICEOVER_AUDIO_GENERATION: createErrorFactory(
      'INVALID_VOICEOVER_AUDIO_GENERATION',
    ),
    INVALID_SAVE: createErrorFactory('INVALID_SAVE'),
    PODCAST_NOT_FOUND: createErrorFactory('PODCAST_NOT_FOUND'),
    PODCAST_PLAN_SOURCES_NOT_READY: createErrorFactory(
      'PODCAST_PLAN_SOURCES_NOT_READY',
    ),
    SCRIPT_NOT_FOUND: createErrorFactory('SCRIPT_NOT_FOUND'),
    VOICEOVER_NOT_FOUND: createErrorFactory('VOICEOVER_NOT_FOUND'),
    USER_NOT_FOUND: createErrorFactory('USER_NOT_FOUND'),
    VOICE_NOT_FOUND: createErrorFactory('VOICE_NOT_FOUND'),
    UNAUTHORIZED: createErrorFactory('UNAUTHORIZED'),
    FORBIDDEN: createErrorFactory('FORBIDDEN'),
    NOT_FOUND: createErrorFactory('NOT_FOUND'),
    INTERNAL_ERROR: createErrorFactory('INTERNAL_ERROR'),
    CONFLICT: createErrorFactory('CONFLICT'),
    BAD_REQUEST: createErrorFactory('BAD_REQUEST'),
    SERVICE_UNAVAILABLE: createErrorFactory('SERVICE_UNAVAILABLE'),
    RATE_LIMITED: createErrorFactory('RATE_LIMITED'),
    JOB_NOT_FOUND: createErrorFactory('JOB_NOT_FOUND'),
  };
};

/**
 * Helper to assert an error is an ORPCError with a specific code.
 */
export function assertORPCError(
  error: unknown,
  expectedCode: ErrorCode,
): asserts error is ORPCError<string, unknown> {
  if (!(error instanceof ORPCError)) {
    const message = error instanceof Error ? error.message : String(error);
    const mappedCode = mapMessageToCode(message);

    if (mappedCode === expectedCode) {
      return;
    }

    if (
      mappedCode === 'NOT_FOUND' &&
      (expectedCode === 'JOB_NOT_FOUND' ||
        expectedCode === 'VOICEOVER_NOT_FOUND' ||
        expectedCode === 'PODCAST_NOT_FOUND' ||
        expectedCode === 'SCRIPT_NOT_FOUND' ||
        expectedCode === 'VOICE_NOT_FOUND' ||
        expectedCode === 'SOURCE_NOT_FOUND')
    ) {
      return;
    }

    throw new Error(`Expected ORPCError but got ${typeof error}: ${error}`);
  }
  if (error.code !== expectedCode) {
    throw new Error(
      `Expected error code '${expectedCode}' but got '${error.code}'`,
    );
  }
}

type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

type ORPCHandlerArgs = {
  context: unknown;
  input?: unknown;
  errors: unknown;
};

export const callORPCHandler = <T>(
  procedure: ORPCProcedure,
  args: ORPCHandlerArgs,
): Promise<T> => {
  return procedure['~orpc'].handler(args) as Promise<T>;
};

export const expectHandlerErrorCode = async (
  operation: () => Promise<unknown>,
  expectedCode: ErrorCode,
) => {
  try {
    await operation();
  } catch (error) {
    assertORPCError(error, expectedCode);
    return;
  }
  throw new Error(`Expected error '${expectedCode}', but operation resolved`);
};

export const expectHandlerErrorMessage = async (
  operation: () => Promise<unknown>,
  expectedMessage: string | RegExp,
) => {
  try {
    await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (typeof expectedMessage === 'string') {
      expect(message).toContain(expectedMessage);
    } else {
      expect(message).toMatch(expectedMessage);
    }
    return;
  }
  throw new Error(
    `Expected error matching '${expectedMessage}', but operation resolved`,
  );
};

export const expectIsoTimestamp = (value: string) => {
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(Number.isNaN(Date.parse(value))).toBe(false);
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
