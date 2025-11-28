// Types
export * from './types';
export * from './errors';

// Service interface
export { Policy, type PolicyService } from './service';

// Current user context
export { CurrentUser, CurrentUserLive, type User } from './user';

// Policy helper functions
export {
  requireOwnership,
  requireRole,
  requirePermission,
  requireAccess,
  requireAdmin,
  withImpersonation,
} from './policies';

// Providers exported via subpath imports:
// - @repo/auth-policy/providers/database
// - @repo/auth-policy/providers/graph
// - @repo/auth-policy/providers/composite
