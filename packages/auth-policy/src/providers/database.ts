import { eq } from '@repo/db';
import { user } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { Effect, Layer } from 'effect';
import { PolicyError } from '../errors';
import { Policy, type PolicyService } from '../service';
import { Role, Permission } from '../types';

/**
 * Database-backed policy provider.
 *
 * Requires the Db service to be provided. The Layer handles
 * the Db dependency internally so the PolicyService interface
 * remains clean (no requirements exposed).
 */
export const DatabasePolicyLive: Layer.Layer<Policy, never, Db> = Layer.effect(
  Policy,
  Effect.gen(function* () {
    // Capture Db from context at layer construction time
    const db = yield* Db;

    const getUserRole = (userId: string): Effect.Effect<Role, PolicyError> =>
      Effect.tryPromise({
        try: async () => {
          const [row] = await db.db
            .select({ role: user.role })
            .from(user)
            .where(eq(user.id, userId));
          return (row?.role as Role) ?? Role.USER;
        },
        catch: (cause) =>
          new PolicyError({
            message: cause instanceof Error ? cause.message : String(cause),
            cause,
          }),
      }).pipe(Effect.withSpan('policy.db.getUserRole'));

    const hasPermission = (
      userId: string,
      resource: string,
      action: Permission,
    ): Effect.Effect<boolean, PolicyError> =>
      Effect.gen(function* () {
        const role = yield* getUserRole(userId);
        // Admin has all permissions
        if (role === Role.ADMIN) return true;
        // Basic user permissions - read and write allowed for regular users
        if (action === Permission.READ) return true;
        if (action === Permission.WRITE) return true;
        // DELETE and ADMIN actions require admin role
        return false;
      }).pipe(Effect.withSpan('policy.db.hasPermission'));

    const canAccess = (
      userId: string,
      resource: string,
      resourceId: string,
      action: Permission,
    ): Effect.Effect<boolean, PolicyError> =>
      Effect.gen(function* () {
        // For DB provider, delegate to base permission check
        // Resource-level ownership should be checked via requireOwnership
        const hasBase = yield* hasPermission(userId, resource, action);
        return hasBase;
      }).pipe(Effect.withSpan('policy.db.canAccess'));

    const getPermissions = (
      userId: string,
      _resource: string,
    ): Effect.Effect<readonly Permission[], PolicyError> =>
      Effect.gen(function* () {
        const role = yield* getUserRole(userId);
        if (role === Role.ADMIN) {
          return [
            Permission.READ,
            Permission.WRITE,
            Permission.DELETE,
            Permission.ADMIN,
          ];
        }
        return [Permission.READ, Permission.WRITE];
      }).pipe(Effect.withSpan('policy.db.getPermissions'));

    const service: PolicyService = {
      getUserRole,
      hasPermission,
      canAccess,
      getPermissions,
    };

    return service;
  }),
);
