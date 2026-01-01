import { Effect } from 'effect';
import { ForbiddenError } from '../errors';
import { Role } from './types';
import { getCurrentUser } from './user';

/** Require current user owns the resource */
export const requireOwnership = (resourceOwnerId: string) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    if (user.id !== resourceOwnerId && user.role !== Role.ADMIN) {
      return yield* Effect.fail(
        new ForbiddenError({
          message: 'You do not own this resource',
        }),
      );
    }
    return user;
  }).pipe(Effect.withSpan('policy.requireOwnership'));

/** Require user has specific role */
export const requireRole = (requiredRole: Role) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    if (user.role !== requiredRole && user.role !== Role.ADMIN) {
      return yield* Effect.fail(
        new ForbiddenError({
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
