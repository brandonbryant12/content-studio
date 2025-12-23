import { Effect, Layer } from 'effect';
import { describe, it, expect } from 'vitest';
import { Forbidden } from '../errors';
import {
  requireOwnership,
  requireRole,
  requireAdmin,
  requirePermission,
  requireAccess,
  withImpersonation,
} from '../policies';
import { Policy, type PolicyService } from '../service';
import { Role, Permission } from '../types';
import { CurrentUser, CurrentUserLive, type User } from '../user';

const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: Role.USER,
  ...overrides,
});

const createAdminUser = (overrides: Partial<User> = {}): User => ({
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: Role.ADMIN,
  ...overrides,
});

const mockPolicyService: PolicyService = {
  getUserRole: (userId) =>
    Effect.succeed(userId === 'admin-1' ? Role.ADMIN : Role.USER),
  hasPermission: (userId, _resource, action) =>
    Effect.succeed(
      userId === 'admin-1' ||
        action === Permission.READ ||
        action === Permission.WRITE,
    ),
  canAccess: (userId, _resource, _resourceId, action) =>
    Effect.succeed(userId === 'admin-1' || action === Permission.READ),
  getPermissions: (userId, _resource) =>
    Effect.succeed(
      userId === 'admin-1'
        ? [
            Permission.READ,
            Permission.WRITE,
            Permission.DELETE,
            Permission.ADMIN,
          ]
        : [Permission.READ, Permission.WRITE],
    ),
};

const MockPolicyLive = Layer.succeed(Policy, mockPolicyService);

const runWithUser = <A, E>(
  user: User,
  effect: Effect.Effect<A, E, CurrentUser>,
) => Effect.runPromise(effect.pipe(Effect.provide(CurrentUserLive(user))));

const runWithUserAndPolicy = <A, E>(
  user: User,
  effect: Effect.Effect<A, E, CurrentUser | Policy>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(Layer.merge(CurrentUserLive(user), MockPolicyLive)),
    ),
  );

describe('requireOwnership', () => {
  it('should succeed when user owns the resource', async () => {
    const user = createTestUser({ id: 'owner-id' });
    const result = await runWithUser(user, requireOwnership('owner-id'));
    expect(result.id).toBe('owner-id');
  });

  it('should fail when user does not own the resource', async () => {
    const user = createTestUser({ id: 'other-id' });
    await expect(
      runWithUser(user, requireOwnership('owner-id')),
    ).rejects.toThrow();
  });

  it('should succeed when admin accesses any resource', async () => {
    const admin = createAdminUser();
    const result = await runWithUser(admin, requireOwnership('other-owner-id'));
    expect(result.role).toBe(Role.ADMIN);
  });
});

describe('requireRole', () => {
  it('should succeed when user has the required role', async () => {
    const user = createTestUser({ role: Role.USER });
    const result = await runWithUser(user, requireRole(Role.USER));
    expect(result.role).toBe(Role.USER);
  });

  it('should fail when user does not have the required role', async () => {
    const user = createTestUser({ role: Role.USER });
    await expect(runWithUser(user, requireRole(Role.ADMIN))).rejects.toThrow();
  });

  it('should succeed when admin for any role', async () => {
    const admin = createAdminUser();
    const result = await runWithUser(admin, requireRole(Role.USER));
    expect(result.role).toBe(Role.ADMIN);
  });
});

describe('requireAdmin', () => {
  it('should succeed for admin users', async () => {
    const admin = createAdminUser();
    const result = await runWithUser(admin, requireAdmin);
    expect(result.role).toBe(Role.ADMIN);
  });

  it('should fail for regular users', async () => {
    const user = createTestUser();
    await expect(runWithUser(user, requireAdmin)).rejects.toThrow();
  });
});

describe('requirePermission', () => {
  it('should succeed when policy grants permission', async () => {
    const user = createTestUser();
    const result = await runWithUserAndPolicy(
      user,
      requirePermission('document', Permission.READ),
    );
    expect(result.id).toBe('user-1');
  });

  it('should fail when policy denies permission', async () => {
    const user = createTestUser();
    await expect(
      runWithUserAndPolicy(
        user,
        requirePermission('document', Permission.DELETE),
      ),
    ).rejects.toThrow();
  });

  it('should succeed for admin on any permission', async () => {
    const admin = createAdminUser();
    const result = await runWithUserAndPolicy(
      admin,
      requirePermission('document', Permission.DELETE),
    );
    expect(result.id).toBe('admin-1');
  });
});

describe('requireAccess', () => {
  it('should succeed when policy grants access to resource instance', async () => {
    const user = createTestUser();
    const result = await runWithUserAndPolicy(
      user,
      requireAccess('document', 'doc-123', Permission.READ),
    );
    expect(result.id).toBe('user-1');
  });

  it('should fail when policy denies access to resource instance', async () => {
    const user = createTestUser();
    await expect(
      runWithUserAndPolicy(
        user,
        requireAccess('document', 'doc-123', Permission.DELETE),
      ),
    ).rejects.toThrow();
  });
});

describe('withImpersonation', () => {
  it('should allow admin to impersonate another user', async () => {
    const admin = createAdminUser();
    const effect = withImpersonation(
      'target-user-id',
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser;
        return currentUser;
      }),
    );

    const result = await runWithUser(admin, effect);
    expect(result.id).toBe('target-user-id');
    expect(result.impersonatedBy).toBe('admin-1');
    expect(result.role).toBe(Role.ADMIN); // Keeps admin role
  });

  it('should fail when non-admin tries to impersonate', async () => {
    const user = createTestUser();
    const effect = withImpersonation(
      'target-user-id',
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser;
        return currentUser;
      }),
    );

    await expect(runWithUser(user, effect)).rejects.toThrow();
  });
});

describe('error types', () => {
  it('should fail with Forbidden for ownership failure', async () => {
    const user = createTestUser({ id: 'other-id' });
    const result = await Effect.runPromiseExit(
      requireOwnership('owner-id').pipe(Effect.provide(CurrentUserLive(user))),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error).toBeInstanceOf(Forbidden);
      expect((error as Forbidden).message).toBe('You do not own this resource');
    }
  });

  it('should fail with Forbidden with role name for role failure', async () => {
    const user = createTestUser();
    const result = await Effect.runPromiseExit(
      requireRole(Role.ADMIN).pipe(Effect.provide(CurrentUserLive(user))),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error).toBeInstanceOf(Forbidden);
      expect((error as Forbidden).message).toBe('Requires admin role');
    }
  });
});
