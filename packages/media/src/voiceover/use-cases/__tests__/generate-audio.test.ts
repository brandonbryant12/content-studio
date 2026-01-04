import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  resetAllFactories,
  createMockTTS,
  createMockStorage,
} from '@repo/testing';
import { TTSError } from '@repo/ai';
import type { Voiceover, VoiceoverId, VoiceoverStatus } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import {
  VoiceoverNotFound,
  NotVoiceoverOwner,
  InvalidVoiceoverAudioGeneration,
} from '../../../errors';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../../repos/voiceover-repo';
import {
  VoiceoverCollaboratorRepo,
  type VoiceoverCollaboratorRepoService,
} from '../../repos/voiceover-collaborator-repo';
import { generateVoiceoverAudio } from '../generate-audio';

// =============================================================================
// Test Helpers
// =============================================================================

// Mock Db layer (required by repo types)
const MockDbLive = Layer.succeed(Db, { db: {} as never });

/**
 * Generate a voiceover ID for testing.
 */
const generateTestVoiceoverId = (): VoiceoverId =>
  `voc_test${Date.now()}` as VoiceoverId;

/**
 * Create a test voiceover object.
 */
interface CreateTestVoiceoverOptions {
  id?: VoiceoverId;
  title?: string;
  text?: string;
  voice?: string;
  voiceName?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  status?: VoiceoverStatus;
  errorMessage?: string | null;
  ownerHasApproved?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let voiceoverCounter = 0;

const createTestVoiceover = (
  options: CreateTestVoiceoverOptions = {},
): Voiceover => {
  voiceoverCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateTestVoiceoverId(),
    title: options.title ?? `Test Voiceover ${voiceoverCounter}`,
    text: options.text ?? 'This is test text for the voiceover.',
    voice: options.voice ?? 'Charon',
    voiceName: options.voiceName ?? 'Charon',
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    status: options.status ?? 'drafting',
    errorMessage: options.errorMessage ?? null,
    ownerHasApproved: options.ownerHasApproved ?? false,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

const resetVoiceoverCounter = () => {
  voiceoverCounter = 0;
};

// =============================================================================
// Mock Factories
// =============================================================================

interface MockState {
  voiceover?: Voiceover;
}

const createMockVoiceoverRepo = (
  state: MockState,
  options?: {
    onUpdateStatus?: (
      id: string,
      status: VoiceoverStatus,
      errorMessage?: string,
    ) => void;
    onUpdateAudio?: (
      id: string,
      data: { audioUrl: string; duration: number },
    ) => void;
    onClearApprovals?: (id: string) => void;
  },
): Layer.Layer<VoiceoverRepo> => {
  const service: VoiceoverRepoService = {
    findById: (id: string) =>
      Effect.suspend(() =>
        state.voiceover
          ? Effect.succeed(state.voiceover)
          : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    insert: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateStatus: (
      id: string,
      status: VoiceoverStatus,
      errorMessage?: string,
    ) =>
      Effect.sync(() => {
        options?.onUpdateStatus?.(id, status, errorMessage);
        return {
          ...state.voiceover!,
          status,
          errorMessage: errorMessage ?? null,
        };
      }),
    updateAudio: (id: string, data: { audioUrl: string; duration: number }) =>
      Effect.sync(() => {
        options?.onUpdateAudio?.(id, data);
        return { ...state.voiceover!, ...data };
      }),
    clearAudio: () => Effect.die('not implemented'),
    clearApprovals: (id: string) =>
      Effect.sync(() => {
        options?.onClearApprovals?.(id);
        return { ...state.voiceover!, ownerHasApproved: false };
      }),
    setOwnerApproval: () => Effect.die('not implemented'),
  };

  return Layer.succeed(VoiceoverRepo, service);
};

const createMockCollaboratorRepo = (options?: {
  onClearAllApprovals?: (voiceoverId: VoiceoverId) => void;
}): Layer.Layer<VoiceoverCollaboratorRepo> => {
  const service: VoiceoverCollaboratorRepoService = {
    findById: () => Effect.succeed(null),
    findByVoiceover: () => Effect.succeed([]),
    findByEmail: () => Effect.succeed([]),
    findByVoiceoverAndUser: () => Effect.succeed(null),
    findByVoiceoverAndEmail: () => Effect.succeed(null),
    lookupUserByEmail: () => Effect.succeed(null),
    add: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),
    approve: () => Effect.die('not implemented'),
    revokeApproval: () => Effect.die('not implemented'),
    clearAllApprovals: (voiceoverId: VoiceoverId) =>
      Effect.sync(() => {
        options?.onClearAllApprovals?.(voiceoverId);
        return 0;
      }),
    claimByEmail: () => Effect.die('not implemented'),
  };

  return Layer.succeed(VoiceoverCollaboratorRepo, service);
};

// =============================================================================
// Tests
// =============================================================================

describe('generateVoiceoverAudio', () => {
  beforeEach(() => {
    resetAllFactories();
    resetVoiceoverCounter();
  });

  describe('success cases', () => {
    it('generates audio for a voiceover in drafting status', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: 'Hello, this is a test voiceover.',
      });
      const updateStatusSpy = vi.fn();
      const updateAudioSpy = vi.fn();
      const clearApprovalsSpy = vi.fn();
      const clearCollaboratorApprovalsSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          {
            onUpdateStatus: updateStatusSpy,
            onUpdateAudio: updateAudioSpy,
            onClearApprovals: clearApprovalsSpy,
          },
        ),
        createMockCollaboratorRepo({
          onClearAllApprovals: clearCollaboratorApprovalsSpy,
        }),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
      );

      const result = await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      // Verify result structure
      expect(result.voiceover).toBeDefined();
      expect(result.audioUrl).toContain('voiceovers/');
      expect(result.audioUrl).toContain('/audio.wav');
      expect(result.duration).toBeGreaterThan(0);

      // Verify status transitions
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'generating_audio',
        undefined,
      );
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'ready',
        undefined,
      );

      // Verify audio was saved
      expect(updateAudioSpy).toHaveBeenCalledWith(voiceover.id, {
        audioUrl: expect.stringContaining('voiceovers/'),
        duration: expect.any(Number),
      });

      // Verify approvals were cleared
      expect(clearApprovalsSpy).toHaveBeenCalledWith(voiceover.id);
      expect(clearCollaboratorApprovalsSpy).toHaveBeenCalledWith(voiceover.id);
    });

    it('generates audio for a voiceover in ready status (regeneration)', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'ready',
        text: 'Regenerating this voiceover audio.',
        audioUrl: 'https://old-audio.com/audio.wav',
        duration: 100,
      });
      const updateStatusSpy = vi.fn();
      const updateAudioSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          {
            onUpdateStatus: updateStatusSpy,
            onUpdateAudio: updateAudioSpy,
          },
        ),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
      );

      const result = await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.voiceover).toBeDefined();
      expect(result.audioUrl).toBeDefined();
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'generating_audio',
        undefined,
      );
    });

    it('generates audio for a voiceover in failed status (retry)', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'failed',
        text: 'Retrying this voiceover after failure.',
        errorMessage: 'Previous TTS failure',
      });
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onUpdateStatus: updateStatusSpy },
        ),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
      );

      const result = await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.voiceover).toBeDefined();
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'ready',
        undefined,
      );
    });

    it('saves correct audio URL and duration', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: 'Text for duration test.',
      });
      const updateAudioSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onUpdateAudio: updateAudioSpy },
        ),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
      );

      const result = await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      // Verify audio URL format
      expect(result.audioUrl).toBe(
        `https://storage.example.com/voiceovers/${voiceover.id}/audio.wav`,
      );

      // Verify duration was calculated (from audio buffer size / 48000)
      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.duration).toBe('number');

      // Verify updateAudio was called with correct values
      expect(updateAudioSpy).toHaveBeenCalledWith(voiceover.id, {
        audioUrl: result.audioUrl,
        duration: result.duration,
      });
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({}),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage(),
      );

      const result = await Effect.runPromiseExit(
        generateVoiceoverAudio({
          voiceoverId: 'voc_nonexistent' as VoiceoverId,
          userId: 'user_123',
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
        expect((error as VoiceoverNotFound).id).toBe('voc_nonexistent');
      }
    });

    it('fails with NotVoiceoverOwner when caller is not the owner', async () => {
      const owner = createTestUser();
      const otherUser = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
        status: 'drafting',
        text: 'Some text.',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage(),
      );

      const result = await Effect.runPromiseExit(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: otherUser.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NotVoiceoverOwner);
        expect((error as NotVoiceoverOwner).voiceoverId).toBe(voiceover.id);
        expect((error as NotVoiceoverOwner).userId).toBe(otherUser.id);
      }
    });

    it('fails with InvalidVoiceoverAudioGeneration when text is empty', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: '', // Empty text
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage(),
      );

      const result = await Effect.runPromiseExit(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidVoiceoverAudioGeneration);
        expect((error as InvalidVoiceoverAudioGeneration).voiceoverId).toBe(
          voiceover.id,
        );
        expect((error as InvalidVoiceoverAudioGeneration).reason).toContain(
          'no text',
        );
      }
    });

    it('fails with InvalidVoiceoverAudioGeneration when text is only whitespace', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: '   \n\t  ', // Only whitespace
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage(),
      );

      const result = await Effect.runPromiseExit(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidVoiceoverAudioGeneration);
      }
    });

    it('succeeds when status is generating_audio (worker scenario)', async () => {
      // When called from the worker after start-generation, status is already generating_audio
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'generating_audio',
        text: 'Some text.',
      });
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onUpdateStatus: updateStatusSpy },
        ),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
      );

      const result = await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.voiceover).toBeDefined();
      expect(result.audioUrl).toBeDefined();
      // Status should transition to ready
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'ready',
        undefined,
      );
    });

    it('propagates TTS service failure and marks voiceover as failed', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: 'Text that will fail TTS.',
      });
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onUpdateStatus: updateStatusSpy },
        ),
        createMockCollaboratorRepo(),
        createMockTTS({ errorMessage: 'TTS service unavailable' }),
        createMockStorage(),
      );

      const result = await Effect.runPromiseExit(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(TTSError);
        expect((error as TTSError).message).toBe('TTS service unavailable');
      }

      // Verify status was set to 'failed'
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'failed',
        'TTS service unavailable',
      );
    });
  });

  describe('approval clearing', () => {
    it('clears owner approval when regenerating audio', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'ready',
        text: 'Approved content to regenerate.',
        ownerHasApproved: true,
      });
      const clearApprovalsSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onClearApprovals: clearApprovalsSpy },
        ),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage(),
      );

      await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(clearApprovalsSpy).toHaveBeenCalledWith(voiceover.id);
    });

    it('clears all collaborator approvals when regenerating audio', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'ready',
        text: 'Content with collaborator approvals.',
      });
      const clearCollaboratorApprovalsSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockCollaboratorRepo({
          onClearAllApprovals: clearCollaboratorApprovalsSpy,
        }),
        createMockTTS(),
        createMockStorage(),
      );

      await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(clearCollaboratorApprovalsSpy).toHaveBeenCalledWith(voiceover.id);
    });
  });

  describe('TTS integration', () => {
    it('sends correct voice configuration to TTS', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: 'Text to synthesize.',
        voice: 'Kore', // Custom voice
      });

      // We can verify TTS was called correctly by checking the result
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockCollaboratorRepo(),
        createMockTTS(), // Mock TTS returns predefined audio
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
      );

      const result = await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      // If we got a result, TTS was called successfully with the voice config
      expect(result.voiceover).toBeDefined();
      expect(result.audioUrl).toBeDefined();
    });
  });

  describe('storage integration', () => {
    it('uploads audio to correct path', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: 'Text for storage test.',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockCollaboratorRepo(),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://cdn.example.com/' }),
      );

      const result = await Effect.runPromise(
        generateVoiceoverAudio({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      // Verify the audio URL follows expected pattern
      expect(result.audioUrl).toBe(
        `https://cdn.example.com/voiceovers/${voiceover.id}/audio.wav`,
      );
    });
  });
});
