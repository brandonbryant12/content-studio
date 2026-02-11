import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestAdmin,
  createTestInfographic,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { ForbiddenError } from '@repo/auth';
import type { Infographic } from '@repo/db/schema';
import { InfographicNotFound } from '../../../errors';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { revokeInfographicApproval } from '../revoke-infographic-approval';

// =============================================================================
// Tests
// =============================================================================

describe('revokeInfographicApproval', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('admin revoke', () => {
    it('clears approval when admin revokes', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const infographic = createTestInfographic({
        createdBy: 'owner-id',
        approvedBy: 'admin-id',
        approvedAt: new Date(),
      });

      const repo = createMockInfographicRepo({
        findById: (id: string) =>
          id === infographic.id
            ? Effect.succeed(infographic)
            : Effect.fail(new InfographicNotFound({ id })),
        clearApproval: (id: string) =>
          Effect.succeed({
            ...infographic,
            approvedBy: null,
            approvedAt: null,
          } as Infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(admin)(
          revokeInfographicApproval({ infographicId: infographic.id }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.infographic.approvedBy).toBeNull();
      expect(result.infographic.approvedAt).toBeNull();
    });
  });

  describe('error cases', () => {
    it('fails with ForbiddenError when non-admin tries to revoke', async () => {
      const regularUser = createTestUser({ id: 'user-id' });
      const infographic = createTestInfographic({
        createdBy: regularUser.id,
        approvedBy: 'admin-id',
        approvedAt: new Date(),
      });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(regularUser)(
          revokeInfographicApproval({ infographicId: infographic.id }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });

    it('fails with InfographicNotFound when infographic does not exist', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });

      const repo = createMockInfographicRepo({
        findById: (id: string) => Effect.fail(new InfographicNotFound({ id })),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(admin)(
          revokeInfographicApproval({ infographicId: 'infg_nonexistent' }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InfographicNotFound);
      }
    });
  });
});
