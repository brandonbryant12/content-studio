import { createMockTTS, MockLLMLive, MOCK_VOICES } from '@repo/ai/testing';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import { user as userTable } from '@repo/db/schema';
import { type StorageService, Storage, StorageError } from '@repo/storage';
import { createInMemoryStorage } from '@repo/storage/testing';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import type { AudioEncoding, VoiceInfo } from '@repo/ai';
import voicesRouter from '../voices';
import {
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
} from './helpers';

type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

const callHandler = <T>(
  procedure: ORPCProcedure,
  args: { context: unknown; input?: unknown; errors: unknown },
): Promise<T> => {
  return procedure['~orpc'].handler(args) as Promise<T>;
};

const expectErrorWithMessage = async (
  promise: Promise<unknown>,
  expectedMessage: string | RegExp,
) => {
  const error = await promise.then(
    () => {
      throw new Error('Expected promise to reject');
    },
    (rejected) => rejected,
  );

  const message = error instanceof Error ? error.message : String(error);
  if (typeof expectedMessage === 'string') {
    expect(message).toContain(expectedMessage);
    return;
  }
  expect(message).toMatch(expectedMessage);
};

type HandlerArgs = { context: unknown; input?: unknown; errors: unknown };

interface VoiceOutput extends VoiceInfo {
  previewUrl: string | null;
}

interface PreviewOutput {
  audioContent: string;
  audioEncoding: AudioEncoding;
  voiceId: string;
}

const handlers = {
  list: (args: HandlerArgs): Promise<VoiceOutput[]> =>
    callHandler<VoiceOutput[]>(
      voicesRouter.list as unknown as ORPCProcedure,
      args,
    ),
  preview: (args: HandlerArgs): Promise<PreviewOutput> =>
    callHandler<PreviewOutput>(
      voicesRouter.preview as unknown as ORPCProcedure,
      args,
    ),
};

interface RuntimeOverrides {
  ttsOptions?: Parameters<typeof createMockTTS>[0];
  storageLayer?: Layer.Layer<Storage>;
}

const createTestRuntime = (
  ctx: TestContext,
  overrides: RuntimeOverrides = {},
): ServerRuntime => {
  const mockTTSLayer = createMockTTS(overrides.ttsOptions);
  const storageLayer = overrides.storageLayer ?? createInMemoryStorage().layer;
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));

  return createTestServerRuntime(
    Layer.mergeAll(
      ctx.dbLayer,
      mockTTSLayer,
      MockLLMLive,
      policyLayer,
      storageLayer,
    ),
  );
};

const insertTestUser = async (
  ctx: TestContext,
  testUser: ReturnType<typeof createTestUser>,
) => {
  await ctx.db.insert(userTable).values({
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    emailVerified: true,
    role: testUser.role,
  });
};

describe('voices router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let testUser: ReturnType<typeof createTestUser>;
  let user: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);
    testUser = createTestUser();
    user = toUser(testUser);
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  describe('list handler', () => {
    it('returns mock voices with stable shape and expected ids', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.list({ context, errors });

      expect(result).toHaveLength(MOCK_VOICES.length);
      expect(result.map((voice) => voice.id)).toEqual(
        MOCK_VOICES.map((voice) => voice.id),
      );

      const firstVoice = result[0]!;

      expect(firstVoice.id).toBe(MOCK_VOICES[0]!.id);
      expect(firstVoice.name).toBe(MOCK_VOICES[0]!.name);
      expect(['male', 'female']).toContain(firstVoice.gender);
      expect(typeof firstVoice.description).toBe('string');
    });

    it('supports custom voice sets from runtime override', async () => {
      const customVoices: VoiceInfo[] = [
        {
          id: 'TestMale',
          name: 'Test Male',
          gender: 'male',
          description: 'A male voice',
        },
        {
          id: 'TestFemale',
          name: 'Test Female',
          gender: 'female',
          description: 'A female voice',
        },
      ];
      const customRuntime = createTestRuntime(ctx, {
        ttsOptions: { voices: customVoices },
      });
      const context = createMockContext(customRuntime, user);

      const result = await handlers.list({ context, errors });

      expect(result).toHaveLength(2);
      expect(result.find((voice) => voice.id === 'TestMale')).toBeDefined();
      expect(result.find((voice) => voice.id === 'TestFemale')).toBeDefined();
    });

    it('fails when preview metadata storage lookup errors', async () => {
      const failingStorage: StorageService = {
        upload: () => Effect.die('Not implemented'),
        download: () => Effect.die('Not implemented'),
        delete: () => Effect.die('Not implemented'),
        getUrl: () => Effect.die('Not implemented'),
        exists: () =>
          Effect.fail(new StorageError({ message: 'Connection failed' })),
      };
      const customRuntime = createTestRuntime(ctx, {
        storageLayer: Layer.succeed(Storage, failingStorage),
      });
      const context = createMockContext(customRuntime, user);

      await expectErrorWithMessage(
        handlers.list({ context, errors }),
        /INTERNAL_ERROR|Storage operation failed|Connection failed/i,
      );
    });
  });

  describe('preview handler', () => {
    it('returns base64 audio preview with expected encoding for valid voice', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.preview({
        context,
        input: { voiceId: 'Charon' },
        errors,
      });

      expect(result.voiceId).toBe('Charon');
      expect(result.audioEncoding).toBe('LINEAR16');
      expect(result.audioContent.length).toBeGreaterThan(0);
      expect(() => Buffer.from(result.audioContent, 'base64')).not.toThrow();
      expect(Buffer.from(result.audioContent, 'base64').length).toBeGreaterThan(
        0,
      );
    });

    it('rejects invalid voice ids with contextual error message', async () => {
      const context = createMockContext(runtime, user);

      await expectErrorWithMessage(
        handlers.preview({
          context,
          input: { voiceId: 'NonexistentVoice' },
          errors,
        }),
        /not found|NonexistentVoice/i,
      );
    });

    it('handles TTS service errors gracefully', async () => {
      const errorRuntime = createTestRuntime(ctx, {
        ttsOptions: { errorMessage: 'TTS service unavailable' },
      });
      const context = createMockContext(errorRuntime, user);

      await expectErrorWithMessage(
        handlers.preview({
          context,
          input: { voiceId: 'Charon' },
          errors,
        }),
        /SERVICE_UNAVAILABLE|service unavailable/i,
      );
    });
  });
});
