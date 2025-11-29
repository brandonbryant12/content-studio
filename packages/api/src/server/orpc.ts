import { os, implement } from '@orpc/server';
import {
  CurrentUserLive,
  Role,
  type User,
} from '@repo/auth-policy';
import { DatabasePolicyLive } from '@repo/auth-policy/providers/database';
import { eq } from '@repo/db';
import { user } from '@repo/db/schema';
import { DbLive } from '@repo/effect/db';
import { PodcastsLive, type Podcasts } from '@repo/podcast';
import { QueueLive, type Queue } from '@repo/queue';
import { GoogleTTSLive, type TTS } from '@repo/tts';
import { Layer, ManagedRuntime } from 'effect';
import type { AuthInstance } from '@repo/auth/server';
import type {
  CurrentUser,
  Policy} from '@repo/auth-policy';
import type { DatabaseInstance } from '@repo/db/client';
import type { Db} from '@repo/effect/db';
import type { Effect} from 'effect';
import { appContract } from '../contracts';

type Session = AuthInstance['$Infer']['Session'];

/**
 * Fetches user role from the database.
 * Returns 'user' as default if user not found.
 */
const getUserRole = async (db: DatabaseInstance, userId: string): Promise<Role> => {
  const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  return (row?.role as Role) ?? Role.USER;
};

/** All services provided by the API context */
export type ApiServices = Db | CurrentUser | Policy | Podcasts | Queue | TTS;

/**
 * Creates an Effect Layer with all required services:
 * - Db: Database access
 * - CurrentUser: Currently authenticated user
 * - Policy: Authorization policy service
 * - Podcasts: Podcast domain service
 * - Queue: Job queue service
 * - TTS: Text-to-speech service
 */
const createEffectLayers = (
  db: DatabaseInstance,
  currentUser: User | null,
): Layer.Layer<ApiServices> => {
  const dbLayer = DbLive(db);
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const ttsLayer = GoogleTTSLive();

  if (currentUser) {
    const userLayer = CurrentUserLive(currentUser);
    const podcastsLayer = PodcastsLive.pipe(Layer.provide(Layer.mergeAll(dbLayer, userLayer)));

    return Layer.mergeAll(dbLayer, userLayer, policyLayer, podcastsLayer, queueLayer, ttsLayer);
  }

  // For unauthenticated requests, provide empty layers for CurrentUser
  // Policy checks will fail if they require CurrentUser
  return Layer.mergeAll(dbLayer, policyLayer, queueLayer, ttsLayer) as Layer.Layer<ApiServices>;
};

export interface ORPCContext {
  db: DatabaseInstance;
  session: Session | null;
  /**
   * Effect layers providing all API services.
   * Use with `Effect.provide(context.layers)` in handlers.
   */
  layers: Layer.Layer<ApiServices>;
  /**
   * Run an Effect with the request's services.
   * Use this to integrate Effect-based domain services in oRPC handlers.
   *
   * @example
   * ```typescript
   * const result = await context.runEffect(
   *   Effect.gen(function* () {
   *     yield* requireOwnership(post.createdBy);
   *     yield* PostService.delete(postId);
   *     return { success: true };
   *   })
   * );
   * ```
   */
  runEffect: <A, E>(effect: Effect.Effect<A, E, ApiServices>) => Promise<A>;
}

export const createORPCContext = async ({
  auth,
  db,
  headers,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  headers: Headers;
}): Promise<ORPCContext> => {
  const session = await auth.api.getSession({ headers });

  // Build current user from session if authenticated
  let currentUser: User | null = null;
  if (session?.user) {
    const role = await getUserRole(db, session.user.id);
    currentUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
    };
  }

  // Create Effect layers with all services
  const layers = createEffectLayers(db, currentUser);
  const runtime = ManagedRuntime.make(layers);

  return {
    db,
    session,
    layers,
    runEffect: <A, E>(effect: Effect.Effect<A, E, ApiServices>) =>
      runtime.runPromise(effect),
  };
};

const timingMiddleware = os.middleware(async ({ next, path }) => {
  const start = Date.now();
  let waitMsDisplay = '';
  if (process.env.NODE_ENV !== 'production') {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    waitMsDisplay = ` (artificial delay: ${waitMs}ms)`;
  }
  const result = await next();
  const end = Date.now();

  console.log(`\t[RPC] /${path.join('/')} executed after ${end - start}ms${waitMsDisplay}`);
  return result;
});

const base = implement(appContract);

export const publicProcedure = base
  .$context<Awaited<ReturnType<typeof createORPCContext>>>()
  .use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(({ context, next, errors }) => {
  if (!context.session?.user) {
    throw errors.UNAUTHORIZED({
      message: 'Missing user session. Please log in!',
    });
  }
  return next({
    context: {
      session: { ...context.session },
    },
  });
});
