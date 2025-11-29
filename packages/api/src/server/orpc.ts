import { os, implement } from '@orpc/server';
import {
  CurrentUserLive,
  Role,
  type User,
} from '@repo/auth-policy';
import { DatabasePolicyLive } from '@repo/auth-policy/providers/database';
import { DocumentsLive, type Documents } from '@repo/documents';
import { DbLive } from '@repo/effect/db';
import { GoogleLive, type LLM } from '@repo/llm';
import { PodcastsLive, PodcastGeneratorLive, type Podcasts, type PodcastGenerator } from '@repo/podcast';
import { QueueLive, type Queue } from '@repo/queue';
import { DatabaseStorageLive, type Storage } from '@repo/storage';
import { GoogleTTSLive, type TTS } from '@repo/tts';
import { Layer, ManagedRuntime, Logger } from 'effect';
import type { AuthInstance } from '@repo/auth/server';
import type {
  CurrentUser,
  Policy} from '@repo/auth-policy';
import type { DatabaseInstance } from '@repo/db/client';
import type { Db} from '@repo/effect/db';
import type { Effect} from 'effect';
import { appContract } from '../contracts';

type Session = AuthInstance['$Infer']['Session'];

/** Services available without authentication */
export type PublicServices = Db | Policy | Storage | Queue | TTS | LLM;

/** Services that require authentication */
export type AuthenticatedServices = PublicServices | CurrentUser | Documents | Podcasts | PodcastGenerator;

/** All services provided by the API context (alias for AuthenticatedServices) */
export type ApiServices = AuthenticatedServices;

/**
 * Creates base layers available to all requests (authenticated or not).
 */
const createBaseLayers = (db: DatabaseInstance, geminiApiKey: string) => {
  const dbLayer = DbLive(db);
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const storageLayer = DatabaseStorageLive.pipe(Layer.provide(dbLayer));
  const ttsLayer = GoogleTTSLive({ apiKey: geminiApiKey });
  const llmLayer = GoogleLive({ apiKey: geminiApiKey });
  const loggerLayer = Logger.pretty;

  return {
    dbLayer,
    policyLayer,
    queueLayer,
    storageLayer,
    ttsLayer,
    llmLayer,
    loggerLayer,
  };
};

/**
 * Creates an Effect Layer with services for authenticated requests.
 */
const createAuthenticatedLayers = (
  db: DatabaseInstance,
  currentUser: User,
  geminiApiKey: string,
): Layer.Layer<AuthenticatedServices, never, never> => {
  const { dbLayer, policyLayer, queueLayer, storageLayer, ttsLayer, llmLayer, loggerLayer } = createBaseLayers(db, geminiApiKey);

  const userLayer = CurrentUserLive(currentUser);
  const documentsLayer = DocumentsLive.pipe(Layer.provide(Layer.mergeAll(dbLayer, userLayer, storageLayer)));
  const podcastsLayer = PodcastsLive.pipe(Layer.provide(Layer.mergeAll(dbLayer, userLayer)));
  const generatorLayer = PodcastGeneratorLive.pipe(
    Layer.provide(Layer.mergeAll(dbLayer, userLayer, documentsLayer, llmLayer, ttsLayer, storageLayer)),
  );

  return Layer.mergeAll(
    dbLayer, userLayer, policyLayer, documentsLayer, storageLayer,
    podcastsLayer, generatorLayer, queueLayer, ttsLayer, llmLayer, loggerLayer
  );
};

/**
 * Creates an Effect Layer with services for unauthenticated requests.
 */
const createPublicLayers = (
  db: DatabaseInstance,
  geminiApiKey: string,
): Layer.Layer<PublicServices, never, never> => {
  const { dbLayer, policyLayer, queueLayer, storageLayer, ttsLayer, llmLayer, loggerLayer } = createBaseLayers(db, geminiApiKey);

  return Layer.mergeAll(dbLayer, policyLayer, storageLayer, queueLayer, ttsLayer, llmLayer, loggerLayer);
};

interface BaseORPCContext {
  db: DatabaseInstance;
  session: Session | null;
}

export interface PublicORPCContext extends BaseORPCContext {
  session: null;
  layers: Layer.Layer<PublicServices, never, never>;
  runEffect: <A, E>(effect: Effect.Effect<A, E, PublicServices>) => Promise<A>;
}

export interface AuthenticatedORPCContext extends BaseORPCContext {
  session: Session;
  layers: Layer.Layer<AuthenticatedServices, never, never>;
  runEffect: <A, E>(effect: Effect.Effect<A, E, AuthenticatedServices>) => Promise<A>;
}

export type ORPCContext = PublicORPCContext | AuthenticatedORPCContext;

export const createORPCContext = async ({
  auth,
  db,
  headers,
  geminiApiKey,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  headers: Headers;
  geminiApiKey: string;
}): Promise<ORPCContext> => {
  const session = await auth.api.getSession({ headers });

  if (session?.user) {
    const currentUser: User = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: Role.USER,
    };

    const layers = createAuthenticatedLayers(db, currentUser, geminiApiKey);
    const runtime = ManagedRuntime.make(layers);

    return {
      db,
      session,
      layers,
      runEffect: <A, E>(effect: Effect.Effect<A, E, AuthenticatedServices>) =>
        runtime.runPromise(effect),
    };
  }

  const layers = createPublicLayers(db, geminiApiKey);
  const runtime = ManagedRuntime.make(layers);

  return {
    db,
    session: null,
    layers,
    runEffect: <A, E>(effect: Effect.Effect<A, E, PublicServices>) =>
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
  // Type narrowing: session exists means we have AuthenticatedORPCContext
  const authenticatedContext = context as AuthenticatedORPCContext;
  return next({
    context: {
      session: authenticatedContext.session,
      layers: authenticatedContext.layers,
    },
  });
});
