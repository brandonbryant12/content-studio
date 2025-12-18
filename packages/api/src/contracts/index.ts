import { oc } from '@orpc/contract';
import documentContract from './documents';
import podcastContract from './podcasts';
import projectContract from './projects';
import voicesContract from './voices';

/**
 * Base errors available to all routes.
 * These map to Effect errors at the API boundary:
 *
 * - INTERNAL_ERROR: DbError, PolicyError, or any unhandled error
 * - UNAUTHORIZED: UnauthorizedError (401)
 * - FORBIDDEN: ForbiddenError (403)
 * - NOT_FOUND: NotFoundError or domain-specific not found (404)
 * - VALIDATION_ERROR: ValidationError (422)
 */
export const appContract = oc
  .errors({
    // Validation error (from oRPC or Effect ValidationError)
    INPUT_VALIDATION_FAILED: {
      status: 422,
    },

    // Authentication required (Effect UnauthorizedError)
    UNAUTHORIZED: {
      status: 401,
      message: 'Missing user session. Please log in!',
    },

    // Permission denied (Effect ForbiddenError)
    FORBIDDEN: {
      status: 403,
      message: 'You do not have enough permission to perform this action.',
    },

    // Generic not found (Effect NotFoundError)
    NOT_FOUND: {
      status: 404,
      message: 'The requested resource was not found.',
    },

    // Internal server error (Effect DbError, PolicyError, or unexpected errors)
    INTERNAL_ERROR: {
      status: 500,
      message: 'An internal error occurred. Please try again later.',
    },

    // External service unavailable (Effect ExternalServiceError, LLMError, TTSError)
    SERVICE_UNAVAILABLE: {
      status: 502,
      message: 'An external service is currently unavailable.',
    },

    // Rate limited (Effect LLMRateLimitError, TTSQuotaExceededError)
    RATE_LIMITED: {
      status: 429,
      message: 'Too many requests. Please try again later.',
    },
  })
  .router({
    documents: documentContract,
    podcasts: podcastContract,
    projects: projectContract,
    voices: voicesContract,
  });
