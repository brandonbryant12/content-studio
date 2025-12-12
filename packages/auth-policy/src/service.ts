import { Context } from 'effect';
import type { PolicyError } from './errors';
import type { Role, Permission } from './types';
import type { Effect } from 'effect';

export interface PolicyService {
  /** Get user's role (may come from DB or external service) */
  readonly getUserRole: (userId: string) => Effect.Effect<Role, PolicyError>;

  /** Check if user has permission on a resource type */
  readonly hasPermission: (
    userId: string,
    resource: string,
    action: Permission,
  ) => Effect.Effect<boolean, PolicyError>;

  /** Check if user can access a specific resource instance */
  readonly canAccess: (
    userId: string,
    resource: string,
    resourceId: string,
    action: Permission,
  ) => Effect.Effect<boolean, PolicyError>;

  /** Get all permissions for a user on a resource type */
  readonly getPermissions: (
    userId: string,
    resource: string,
  ) => Effect.Effect<readonly Permission[], PolicyError>;
}

export class Policy extends Context.Tag('@repo/auth-policy/Policy')<
  Policy,
  PolicyService
>() {}
