// Re-export from server
export {
  createAuth,
  getBaseOptions,
  getSession,
  getSessionWithRole,
  requireSession,
  type AuthOptions,
  type AuthInstance,
} from './server';

// Re-export from policy
export {
  Role,
  type User,
  CurrentUserRef,
  getCurrentUser,
  getMaybeCurrentUser,
  withCurrentUser,
  Policy,
  type PolicyService,
  DatabasePolicyLive,
  requireOwnership,
  requireRole,
} from './policy';

// Re-export errors
export { UnauthorizedError, ForbiddenError, PolicyError } from './errors';
