import { Effect } from 'effect';
import type { Permission } from './types';
import { Forbidden } from './errors';
import { Policy } from './service';
import { Role } from './types';
import { CurrentUser } from './user';

/** Require current user owns the resource */
export const requireOwnership = (resourceOwnerId: string) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    if (user.id !== resourceOwnerId && user.role !== Role.ADMIN) {
      return yield* Effect.fail(
        new Forbidden({
          message: 'You do not own this resource',
        }),
      );
    }
    return user;
  }).pipe(Effect.withSpan('policy.requireOwnership'));

/** Require user has specific role */
export const requireRole = (requiredRole: Role) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    if (user.role !== requiredRole && user.role !== Role.ADMIN) {
      return yield* Effect.fail(
        new Forbidden({
          message: `Requires ${requiredRole} role`,
        }),
      );
    }
    return user;
  }).pipe(
    Effect.withSpan('policy.requireRole', {
      attributes: { 'policy.role': requiredRole },
    }),
  );

/** Require user has permission via PolicyService (supports external policies) */
export const requirePermission = (resource: string, action: Permission) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    const policy = yield* Policy;
    const allowed = yield* policy.hasPermission(user.id, resource, action);
    if (!allowed) {
      return yield* Effect.fail(
        new Forbidden({
          message: `Permission denied: ${action} on ${resource}`,
          resource,
          action,
        }),
      );
    }
    return user;
  }).pipe(
    Effect.withSpan('policy.requirePermission', {
      attributes: { 'policy.resource': resource, 'policy.action': action },
    }),
  );

/** Require user can access specific resource instance */
export const requireAccess = (
  resource: string,
  resourceId: string,
  action: Permission,
) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    const policy = yield* Policy;
    const allowed = yield* policy.canAccess(
      user.id,
      resource,
      resourceId,
      action,
    );
    if (!allowed) {
      return yield* Effect.fail(
        new Forbidden({
          message: `Access denied: ${action} on ${resource}/${resourceId}`,
          resource,
          action,
        }),
      );
    }
    return user;
  }).pipe(Effect.withSpan('policy.requireAccess'));

/** Require user has admin role */
export const requireAdmin = requireRole(Role.ADMIN);

/** Allow admin to impersonate another user */
export const withImpersonation = <A, E, R>(
  targetUserId: string,
  effect: Effect.Effect<A, E, R>,
) =>
  Effect.gen(function* () {
    const admin = yield* CurrentUser;
    if (admin.role !== Role.ADMIN) {
      return yield* Effect.fail(
        new Forbidden({
          message: 'Only admins can impersonate',
        }),
      );
    }
    return yield* Effect.provideService(effect, CurrentUser, {
      ...admin,
      id: targetUserId,
      impersonatedBy: admin.id,
    });
  }).pipe(
    Effect.withSpan('policy.impersonate', {
      attributes: { 'policy.target': targetUserId },
    }),
  );
