// Re-export auth-related errors from centralized error catalog
export {
  UnauthorizedError as Unauthorized,
  ForbiddenError as Forbidden,
  PolicyError,
} from '@repo/db/errors';
