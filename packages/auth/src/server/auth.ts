import { type BetterAuthOptions, betterAuth } from 'better-auth';

import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';
import urlJoin from 'url-join';
import type { DatabaseInstance } from '@repo/db/client';
import { podcastCollaborator, user } from '@repo/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface AuthOptions {
  webUrl: string;
  serverUrl: string;
  apiPath: `/${string}`;
  authSecret: string;
  db: DatabaseInstance;
}

export type AuthInstance = ReturnType<typeof createAuth>;

/**
 * This function is abstracted for schema generations in cli-config.ts
 */
export const getBaseOptions = (db: DatabaseInstance) =>
  ({
    database: drizzleAdapter(db, {
      provider: 'pg',
    }),

    /**
     * Only uncomment the line below if you are using plugins, so that
     * your types can be correctly inferred:
     */
    plugins: [openAPI()],
  }) satisfies BetterAuthOptions;

export const createAuth = ({
  webUrl,
  serverUrl,
  apiPath,
  db,
  authSecret,
}: AuthOptions) => {
  return betterAuth({
    ...getBaseOptions(db),
    baseURL: urlJoin(serverUrl, apiPath, 'auth'),
    secret: authSecret,
    trustedOrigins: [webUrl].map((url) => new URL(url).origin),
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user',
          input: false,
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    databaseHooks: {
      session: {
        create: {
          /**
           * Claim pending collaborator invites when a session is created.
           *
           * When a user logs in or signs up, we check if there are any
           * pending collaborator invites (where userId is null) matching
           * their email and claim them by setting the userId.
           *
           * This allows users to be invited as collaborators before they
           * have an account, and have those invites automatically linked
           * when they sign up or log in.
           */
          after: async (session) => {
            // Get user email from database
            const [sessionUser] = await db
              .select({ email: user.email })
              .from(user)
              .where(eq(user.id, session.userId))
              .limit(1);

            if (!sessionUser?.email) {
              return;
            }

            // Claim all pending invites for this email
            await db
              .update(podcastCollaborator)
              .set({ userId: session.userId })
              .where(
                and(
                  eq(podcastCollaborator.email, sessionUser.email),
                  isNull(podcastCollaborator.userId),
                ),
              );
          },
        },
      },
    },
  });
};
