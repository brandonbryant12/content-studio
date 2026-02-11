import { Effect } from 'effect';
import type { AuthInstance } from './auth';
import type { PolicyError } from '../errors';
import type { User } from '../policy/types';
import { UnauthorizedError } from '../errors';
import { Policy } from '../policy/service';

type Session = AuthInstance['$Infer']['Session'];

/**
 * Get session from headers - Effect wrapper around better-auth.
 * Returns null if no session exists or if there's an auth error.
 */
export const getSession = (
  auth: AuthInstance,
  headers: Headers,
): Effect.Effect<Session | null> =>
  Effect.tryPromise({
    try: () => auth.api.getSession({ headers }),
    catch: (error) => error,
  }).pipe(
    Effect.map((s) => s ?? null),
    Effect.catchAll(() => Effect.succeed(null)),
    Effect.withSpan('auth.getSession'),
  );

/**
 * Get session with user role loaded from database.
 * This is the main entry point for authenticated requests.
 * Returns null if no session exists.
 */
export const getSessionWithRole = (
  auth: AuthInstance,
  headers: Headers,
): Effect.Effect<
  { session: Session; user: User } | null,
  PolicyError,
  Policy
> =>
  Effect.gen(function* () {
    const session = yield* getSession(auth, headers);
    if (!session?.user) return null;

    const policy = yield* Policy;
    const role = yield* policy.getUserRole(session.user.id);

    const user: User = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
    };

    return { session, user };
  }).pipe(Effect.withSpan('auth.getSessionWithRole'));

/**
 * Require a valid session - fails with UnauthorizedError if not authenticated.
 */
export const requireSession = (
  auth: AuthInstance,
  headers: Headers,
): Effect.Effect<
  { session: Session; user: User },
  UnauthorizedError | PolicyError,
  Policy
> =>
  Effect.gen(function* () {
    const result = yield* getSessionWithRole(auth, headers);
    if (!result) {
      return yield* Effect.fail(
        new UnauthorizedError({ message: 'Authentication required' }),
      );
    }
    return result;
  }).pipe(Effect.withSpan('auth.requireSession'));
