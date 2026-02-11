import { ForbiddenError } from '@repo/auth';
import {
  createTestUser,
  createTestAdmin,
  createTestInfographic,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Infographic } from '@repo/db/schema';
import { InfographicNotFound } from '../../../errors';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { approveInfographic } from '../approve-infographic';

// =============================================================================
// Tests
// =============================================================================

describe('approveInfographic', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('admin approval', () => {
    it('admin can approve an infographic', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const owner = createTestUser({ id: 'owner-id' });
      const infographic = createTestInfographic({ createdBy: owner.id });

      const setApprovalSpy = vi.fn();
      const repo = createMockInfographicRepo({
        findById: (id: string) =>
          id === infographic.id
            ? Effect.succeed(infographic)
            : Effect.fail(new InfographicNotFound({ id })),
        setApproval: (id: string, approvedBy: string) => {
          setApprovalSpy(id, approvedBy);
          return Effect.succeed({
            ...infographic,
            approvedBy,
            approvedAt: new Date(),
          } as Infographic);
        },
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(admin)(
          approveInfographic({ infographicId: infographic.id }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.infographic.approvedBy).toBe(admin.id);
      expect(result.infographic.approvedAt).toBeDefined();
      expect(setApprovalSpy).toHaveBeenCalledWith(infographic.id, admin.id);
    });

    it('idempotent re-approval succeeds', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const infographic = createTestInfographic({
        createdBy: 'owner-id',
        approvedBy: 'other-admin-id',
        approvedAt: new Date(),
      });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
        setApproval: (id: string, approvedBy: string) =>
          Effect.succeed({
            ...infographic,
            approvedBy,
            approvedAt: new Date(),
          } as Infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(admin)(
          approveInfographic({ infographicId: infographic.id }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.infographic.approvedBy).toBe(admin.id);
    });
  });

  describe('error cases', () => {
    it('fails with ForbiddenError when non-admin tries to approve', async () => {
      const regularUser = createTestUser({ id: 'user-id' });
      const infographic = createTestInfographic({
        createdBy: regularUser.id,
      });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(regularUser)(
          approveInfographic({ infographicId: infographic.id }),
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
          approveInfographic({ infographicId: 'infg_nonexistent' }),
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
