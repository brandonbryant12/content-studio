import { Effect, Layer } from 'effect';
import type { Permission } from '../types';
import { Policy, type PolicyService } from '../service';

export interface CompositeConfig {
  /** Primary provider for user roles (e.g., database) */
  readonly roleProvider: PolicyService;
  /** Additional providers for permissions (e.g., Graph API) */
  readonly permissionProviders: readonly PolicyService[];
}

const make = (config: CompositeConfig): PolicyService => ({
  getUserRole: (userId) =>
    config.roleProvider.getUserRole(userId).pipe(Effect.withSpan('policy.composite.getUserRole')),

  hasPermission: (userId, resource, action) =>
    Effect.gen(function* () {
      // Check all providers - if any grants permission, allow
      const results = yield* Effect.all(
        [config.roleProvider, ...config.permissionProviders].map((p) =>
          p.hasPermission(userId, resource, action).pipe(Effect.catchAll(() => Effect.succeed(false))),
        ),
        { concurrency: 'unbounded' },
      );
      return results.some(Boolean);
    }).pipe(Effect.withSpan('policy.composite.hasPermission')),

  canAccess: (userId, resource, resourceId, action) =>
    Effect.gen(function* () {
      const results = yield* Effect.all(
        [config.roleProvider, ...config.permissionProviders].map((p) =>
          p.canAccess(userId, resource, resourceId, action).pipe(
            Effect.catchAll(() => Effect.succeed(false)),
          ),
        ),
        { concurrency: 'unbounded' },
      );
      return results.some(Boolean);
    }).pipe(Effect.withSpan('policy.composite.canAccess')),

  getPermissions: (userId, resource) =>
    Effect.gen(function* () {
      const results = yield* Effect.all(
        [config.roleProvider, ...config.permissionProviders].map((p) =>
          p.getPermissions(userId, resource).pipe(
            Effect.catchAll(() => Effect.succeed([] as readonly Permission[])),
          ),
        ),
        { concurrency: 'unbounded' },
      );
      // Merge and dedupe permissions from all providers
      return [...new Set(results.flat())];
    }).pipe(Effect.withSpan('policy.composite.getPermissions')),
});

export const CompositePolicyLive = (config: CompositeConfig): Layer.Layer<Policy> =>
  Layer.succeed(Policy, make(config));
