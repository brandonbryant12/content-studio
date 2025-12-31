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

// Provider exported via subpath import:
// - @repo/auth-policy/providers/database
