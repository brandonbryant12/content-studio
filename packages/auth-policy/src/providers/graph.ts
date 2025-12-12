import { Effect, Layer, Context } from 'effect';
import { PolicyError } from '../errors';
import { Policy, type PolicyService } from '../service';
import { Role, Permission } from '../types';

export interface GraphConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

export class GraphClient extends Context.Tag('@repo/auth-policy/GraphClient')<
  GraphClient,
  { readonly config: GraphConfig }
>() {}

const make = Effect.gen(function* () {
  const { config } = yield* GraphClient;

  const getAccessToken = async (): Promise<string> => {
    const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });
    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  };

  const service: PolicyService = {
    getUserRole: (userId) =>
      Effect.tryPromise({
        try: async () => {
          const token = await getAccessToken();
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/users/${userId}/memberOf`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = (await response.json()) as {
            value?: Array<{ displayName: string }>;
          };
          const isAdmin = data.value?.some((g) => g.displayName === 'Admins');
          return isAdmin ? Role.ADMIN : Role.USER;
        },
        catch: (cause) =>
          new PolicyError({
            message: 'Failed to get role from Graph API',
            cause,
          }),
      }).pipe(Effect.withSpan('policy.graph.getUserRole')),

    hasPermission: (userId, _resource, _action) =>
      Effect.tryPromise({
        try: async () => {
          // Check app role assignments or group memberships
          // This implementation checks if user has any group membership
          // Extend as needed for specific permission logic
          const token = await getAccessToken();
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/users/${userId}/memberOf`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = (await response.json()) as { value?: unknown[] };
          return (data.value?.length ?? 0) > 0;
        },
        catch: (cause) =>
          new PolicyError({
            message: 'Failed to check permission via Graph API',
            cause,
          }),
      }).pipe(Effect.withSpan('policy.graph.hasPermission')),

    canAccess: (userId, resource, resourceId, action) =>
      service.hasPermission(userId, resource, action),

    getPermissions: (userId, _resource) =>
      Effect.gen(function* () {
        const role = yield* service.getUserRole(userId);
        if (role === Role.ADMIN) {
          return [
            Permission.READ,
            Permission.WRITE,
            Permission.DELETE,
            Permission.ADMIN,
          ];
        }
        return [Permission.READ, Permission.WRITE];
      }).pipe(Effect.withSpan('policy.graph.getPermissions')),
  };

  return service;
});

export const GraphPolicyLive = (config: GraphConfig): Layer.Layer<Policy> =>
  Layer.effect(Policy, make).pipe(
    Layer.provide(Layer.succeed(GraphClient, { config })),
  );
