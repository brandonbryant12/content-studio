import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { bearer, openAPI } from 'better-auth/plugins';
import urlJoin from 'url-join';
import type { DatabaseInstance } from '@repo/db/client';
import {
  MicrosoftRoleSyncError,
  type MicrosoftRoleGroupConfig,
  syncUserRoleFromMicrosoftGraph,
} from './microsoft-role-sync';
import { ensureEncryptedOAuthToken } from './oauth-token-crypto';

export const AuthMode = {
  DEV_PASSWORD: 'dev-password',
  SSO_ONLY: 'sso-only',
} as const;
export type AuthMode = (typeof AuthMode)[keyof typeof AuthMode];

export interface MicrosoftSSOConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  roleGroups: MicrosoftRoleGroupConfig;
}

export interface AuthOptions {
  webUrl: string;
  serverUrl: string;
  apiPath: `/${string}`;
  authSecret: string;
  authMode: AuthMode;
  db: DatabaseInstance;
  trustedOrigins?: string[];
  microsoftSSO?: MicrosoftSSOConfig;
}

export type AuthInstance = ReturnType<typeof createAuth>;

const normalizeOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
};

export const buildTrustedOrigins = (
  webUrl: string,
  trustedOrigins: string[] = [],
): string[] => {
  const origins = new Set<string>([new URL(webUrl).origin]);
  for (const origin of trustedOrigins) {
    const trimmed = origin.trim();
    if (trimmed.length === 0) continue;
    origins.add(normalizeOrigin(trimmed));
  }
  return [...origins];
};

const isPasswordAuthEnabled = (authMode: AuthMode) =>
  authMode === AuthMode.DEV_PASSWORD;

const isMicrosoftSSOEnabled = (authMode: AuthMode) =>
  authMode === AuthMode.SSO_ONLY;

const protectAccountSecrets = async <
  T extends Partial<{
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
  }>,
>(
  account: T,
  authSecret: string,
): Promise<T> => ({
  ...account,
  ...('accessToken' in account
    ? {
        accessToken: await ensureEncryptedOAuthToken({
          authSecret,
          token: account.accessToken,
        }),
      }
    : {}),
  ...('refreshToken' in account
    ? {
        refreshToken: await ensureEncryptedOAuthToken({
          authSecret,
          token: account.refreshToken,
        }),
      }
    : {}),
  ...('idToken' in account
    ? {
        idToken: await ensureEncryptedOAuthToken({
          authSecret,
          token: account.idToken,
        }),
      }
    : {}),
});

const buildMicrosoftDatabaseHooks = ({
  authSecret,
  db,
  microsoftSSO,
}: {
  authSecret: string;
  db: DatabaseInstance;
  microsoftSSO: MicrosoftSSOConfig;
}): NonNullable<BetterAuthOptions['databaseHooks']> => ({
  account: {
    create: {
      before: async (account) => ({
        data: await protectAccountSecrets(account, authSecret),
      }),
    },
    update: {
      before: async (account) => ({
        data: await protectAccountSecrets(account, authSecret),
      }),
    },
  },
  session: {
    create: {
      before: async (session, context) => {
        const callbackPath = context?.path;
        const isMicrosoftCallback =
          typeof callbackPath === 'string' &&
          (callbackPath.startsWith('/callback/microsoft') ||
            callbackPath.startsWith('/oauth2/callback/microsoft'));
        if (!isMicrosoftCallback) return;

        try {
          await syncUserRoleFromMicrosoftGraph({
            authSecret,
            db,
            userId: session.userId,
            roleGroups: microsoftSSO.roleGroups,
          });
        } catch (error) {
          console.warn(
            '[AUTH] Denying Microsoft SSO session creation:',
            error instanceof Error ? error.message : String(error),
          );

          if (
            error instanceof MicrosoftRoleSyncError &&
            error.code === 'MICROSOFT_GROUP_MEMBERSHIP_REQUIRED'
          ) {
            throw new APIError('FORBIDDEN', {
              code: 'SSO_GROUP_MEMBERSHIP_REQUIRED',
              message: 'Microsoft SSO group membership is required',
            });
          }

          throw new APIError('FORBIDDEN', {
            code: 'SSO_AUTHORIZATION_FAILED',
            message: 'Microsoft SSO authorization failed',
          });
        }
      },
    },
  },
});

const MICROSOFT_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'GroupMember.Read.All',
];

/**
 * This function is abstracted for schema generations in cli-config.ts
 */
export const getBaseOptions = (db: DatabaseInstance) =>
  ({
    database: drizzleAdapter(db, { provider: 'pg' }),
    plugins: [openAPI(), bearer({ requireSignature: true })],
  }) satisfies BetterAuthOptions;

export const createAuth = ({
  webUrl,
  serverUrl,
  apiPath,
  db,
  authSecret,
  authMode,
  trustedOrigins,
  microsoftSSO,
}: AuthOptions) =>
  betterAuth({
    ...getBaseOptions(db),
    baseURL: urlJoin(serverUrl, apiPath, 'auth'),
    secret: authSecret,
    trustedOrigins: buildTrustedOrigins(webUrl, trustedOrigins),
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user',
          input: false,
        },
      },
    },
    socialProviders:
      isMicrosoftSSOEnabled(authMode) && microsoftSSO
        ? {
            microsoft: {
              clientId: microsoftSSO.clientId,
              clientSecret: microsoftSSO.clientSecret,
              tenantId: microsoftSSO.tenantId,
              scope: MICROSOFT_SCOPES,
            },
          }
        : undefined,
    account:
      isMicrosoftSSOEnabled(authMode) && microsoftSSO
        ? {
            encryptOAuthTokens: true,
          }
        : undefined,
    databaseHooks:
      isMicrosoftSSOEnabled(authMode) && microsoftSSO
        ? buildMicrosoftDatabaseHooks({
            authSecret,
            db,
            microsoftSSO,
          })
        : undefined,
    emailAndPassword: {
      enabled: isPasswordAuthEnabled(authMode),
      autoSignIn: true,
      requireEmailVerification: false,
    },
  });
