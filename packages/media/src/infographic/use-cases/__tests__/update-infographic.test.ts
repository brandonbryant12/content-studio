import { ForbiddenError } from '@repo/auth';
import {
  createTestUser,
  createTestInfographic,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Infographic } from '@repo/db/schema';
import { InfographicNotFound } from '../../../errors';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { updateInfographic } from '../update-infographic';

// =============================================================================
// Tests
// =============================================================================

describe('updateInfographic', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('updates title when owned by user', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({
        createdBy: user.id,
        title: 'Original Title',
      });

      const repo = createMockInfographicRepo({
        findById: (id: string) =>
          id === infographic.id
            ? Effect.succeed(infographic)
            : Effect.fail(new InfographicNotFound({ id })),
        update: (_id: string, data) =>
          Effect.succeed({
            ...infographic,
            ...data,
            updatedAt: new Date(),
          } as Infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updateInfographic({ id: infographic.id, title: 'Updated Title' }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.title).toBe('Updated Title');
    });

    it('updates multiple fields at once', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({ createdBy: user.id });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
        update: (_id: string, data) =>
          Effect.succeed({
            ...infographic,
            ...data,
            updatedAt: new Date(),
          } as Infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updateInfographic({
            id: infographic.id,
            title: 'New Title',
            prompt: 'New Prompt',
            infographicType: 'comparison',
            stylePreset: 'bold_colorful',
            format: 'landscape',
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.title).toBe('New Title');
      expect(result.prompt).toBe('New Prompt');
      expect(result.infographicType).toBe('comparison');
      expect(result.stylePreset).toBe('bold_colorful');
      expect(result.format).toBe('landscape');
    });

    it('updates sourceDocumentIds', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({
        createdBy: user.id,
        sourceDocumentIds: [],
      });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
        update: (_id: string, data) =>
          Effect.succeed({
            ...infographic,
            ...data,
            sourceDocumentIds: data.sourceDocumentIds
              ? [...data.sourceDocumentIds]
              : infographic.sourceDocumentIds,
            updatedAt: new Date(),
          } as Infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          updateInfographic({
            id: infographic.id,
            sourceDocumentIds: ['doc1', 'doc2'],
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.sourceDocumentIds).toEqual(['doc1', 'doc2']);
    });
  });

  describe('authorization', () => {
    it('fails with ForbiddenError when non-owner tries to update', async () => {
      const user = createTestUser();
      const otherUser = createTestUser();
      const infographic = createTestInfographic({
        createdBy: otherUser.id,
      });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          updateInfographic({ id: infographic.id, title: 'Hacked' }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });
  });

  describe('error cases', () => {
    it('fails with InfographicNotFound when infographic does not exist', async () => {
      const user = createTestUser();

      const repo = createMockInfographicRepo({
        findById: (id: string) => Effect.fail(new InfographicNotFound({ id })),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          updateInfographic({ id: 'infg_nonexistent', title: 'Test' }),
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
