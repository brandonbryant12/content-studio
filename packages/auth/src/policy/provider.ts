import { eq } from '@repo/db';
import { user } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { Effect, Layer } from 'effect';
import { PolicyError } from '../errors';
import { Policy, type PolicyService } from './service';
import { Role } from './types';

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

    const service: PolicyService = {
      getUserRole,
    };

    return service;
  }),
);
