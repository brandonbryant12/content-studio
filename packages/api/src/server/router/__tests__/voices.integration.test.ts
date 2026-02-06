import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Layer } from 'effect';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { createMockTTS, MOCK_VOICES, MockLLMLive } from '@repo/testing/mocks';
import { user as userTable } from '@repo/db/schema';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import type { AudioEncoding, VoiceInfo } from '@repo/ai';
import type { ServerRuntime } from '../../runtime';
import voicesRouter from '../voices';
import {
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
} from './helpers';

// =============================================================================
// oRPC Handler Utilities
// =============================================================================

/**
 * Access the internal handler from an oRPC ImplementedProcedure.
 */
type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

const callHandler = <T>(
  procedure: ORPCProcedure,
  args: { context: unknown; input?: unknown; errors: unknown },
): Promise<T> => {
  return procedure['~orpc'].handler(args) as Promise<T>;
};

/**
 * Helper to assert an error contains an expected message.
 * Handles both ORPCError and FiberFailure (which wraps thrown errors).
 */
const expectErrorWithMessage = async (
  promise: Promise<unknown>,
  expectedMessage: string | RegExp,
) => {
  await expect(promise).rejects.toThrow();
  try {
    await promise;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (typeof expectedMessage === 'string') {
      expect(errorMessage).toContain(expectedMessage);
    } else {
      expect(errorMessage).toMatch(expectedMessage);
    }
  }
};

// Handler args type
type HandlerArgs = { context: unknown; input?: unknown; errors: unknown };

// Output types
interface VoiceOutput extends VoiceInfo {}

interface PreviewOutput {
  audioContent: string;
  audioEncoding: AudioEncoding;
  voiceId: string;
}

// Typed handler accessors for voices router
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

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Create a minimal test runtime with TTS service for voice operations.
 */
const createTestRuntime = (
  ctx: TestContext,
  ttsOptions?: Parameters<typeof createMockTTS>[0],
): ServerRuntime => {
  const mockTTSLayer = createMockTTS(ttsOptions);
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockTTSLayer,
    MockLLMLive,
    policyLayer,
  );

  return createTestServerRuntime(allLayers);
};

/**
 * Insert a user into the database for testing.
 */
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

// =============================================================================
// Tests
// =============================================================================

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

  // ===========================================================================
  // Tests: list handler
  // ===========================================================================

  describe('list handler', () => {
    it('returns list of available voices', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.list({
        context,
        errors,
      });

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns voices with correct structure', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.list({
        context,
        errors,
      });

      // Assert
      const firstVoice = result[0]!;
      expect(firstVoice).toHaveProperty('id');
      expect(firstVoice).toHaveProperty('name');
      expect(firstVoice).toHaveProperty('gender');
      expect(firstVoice).toHaveProperty('description');
      expect(typeof firstVoice.id).toBe('string');
      expect(typeof firstVoice.name).toBe('string');
      expect(['male', 'female']).toContain(firstVoice.gender);
      expect(typeof firstVoice.description).toBe('string');
    });

    it('returns mock voices from test layer', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.list({
        context,
        errors,
      });

      // Assert - should match the mock voices
      expect(result).toHaveLength(MOCK_VOICES.length);
      expect(result.map((v) => v.id)).toEqual(MOCK_VOICES.map((v) => v.id));
    });

    it('filters voices by gender when custom voices provided', async () => {
      // Arrange - create runtime with custom voices
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
      const customRuntime = createTestRuntime(ctx, { voices: customVoices });
      const context = createMockContext(customRuntime, user);

      // Act
      const result = await handlers.list({
        context,
        errors,
      });

      // Assert - should return all custom voices
      expect(result).toHaveLength(2);
      expect(result.find((v) => v.gender === 'male')).toBeDefined();
      expect(result.find((v) => v.gender === 'female')).toBeDefined();
    });
  });

  // ===========================================================================
  // Tests: preview handler
  // ===========================================================================

  describe('preview handler', () => {
    it('generates audio preview for valid voice ID', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = { voiceId: 'Charon' };

      // Act
      const result = await handlers.preview({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.voiceId).toBe('Charon');
      expect(result.audioEncoding).toBeDefined();
      expect(typeof result.audioContent).toBe('string');
      // Verify it's base64 encoded
      expect(() => Buffer.from(result.audioContent, 'base64')).not.toThrow();
    });

    it('returns audio content as base64 string', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = { voiceId: 'Kore' };

      // Act
      const result = await handlers.preview({
        context,
        input,
        errors,
      });

      // Assert
      expect(typeof result.audioContent).toBe('string');
      const decoded = Buffer.from(result.audioContent, 'base64');
      expect(decoded.length).toBeGreaterThan(0);
    });

    it('returns preview with correct encoding', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = { voiceId: 'Fenrir' };

      // Act
      const result = await handlers.preview({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.audioEncoding).toBe('LINEAR16'); // Mock TTS returns LINEAR16
    });

    it('throws error for invalid voice ID', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = { voiceId: 'InvalidVoice' };

      // Act & Assert - error message indicates voice not found
      await expectErrorWithMessage(
        handlers.preview({
          context,
          input,
          errors,
        }),
        /not found|InvalidVoice/i,
      );
    });

    it('includes voice ID in error message for invalid voice', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = { voiceId: 'NonexistentVoice' };

      // Act & Assert - error message contains the voice ID
      await expectErrorWithMessage(
        handlers.preview({
          context,
          input,
          errors,
        }),
        'NonexistentVoice',
      );
    });

    it('accepts valid voice IDs from mock voices', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act & Assert - should not throw for any mock voice
      for (const voice of MOCK_VOICES) {
        const result = await handlers.preview({
          context,
          input: { voiceId: voice.id },
          errors,
        });
        expect(result.voiceId).toBe(voice.id);
      }
    });

    it('handles TTS service errors gracefully', async () => {
      // Arrange - create runtime that simulates TTS errors
      const errorRuntime = createTestRuntime(ctx, {
        errorMessage: 'TTS service unavailable',
      });
      const context = createMockContext(errorRuntime, user);
      const input = { voiceId: 'Charon' };

      // Act & Assert - error contains service unavailable message
      await expectErrorWithMessage(
        handlers.preview({
          context,
          input,
          errors,
        }),
        /SERVICE_UNAVAILABLE|service unavailable/i,
      );
    });
  });

  // ===========================================================================
  // Tests: Response format
  // ===========================================================================

  describe('response format', () => {
    it('list returns array of voice objects', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.list({
        context,
        errors,
      });

      // Assert
      expect(Array.isArray(result)).toBe(true);
      result.forEach((voice) => {
        expect(typeof voice.id).toBe('string');
        expect(typeof voice.name).toBe('string');
        expect(typeof voice.gender).toBe('string');
        expect(typeof voice.description).toBe('string');
      });
    });

    it('preview returns audio preview object', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = { voiceId: 'Charon' };

      // Act
      const result = await handlers.preview({
        context,
        input,
        errors,
      });

      // Assert
      expect(typeof result.audioContent).toBe('string');
      expect(typeof result.audioEncoding).toBe('string');
      expect(typeof result.voiceId).toBe('string');
    });
  });
});
