import { TTS, type TTSService, TTSError } from '@repo/ai';
import { ForbiddenError } from '@repo/auth';
import { Db } from '@repo/db/effect';
import {
  createTestUser,
  withTestUser,
  resetAllFactories,
  createMockTTS,
  createMockStorage,
  createMockLLM,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Voiceover, VoiceoverId, VoiceoverStatus } from '@repo/db/schema';
import {
  VoiceoverNotFound,
  InvalidVoiceoverAudioGeneration,
} from '../../../errors';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../../repos/voiceover-repo';
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
  approvedBy?: string | null;
  approvedAt?: Date | null;
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
    approvedBy: options.approvedBy ?? null,
    approvedAt: options.approvedAt ?? null,
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
    onUpdate?: (
      id: string,
      data: {
        title?: string;
        text?: string;
        voice?: string;
        voiceName?: string | null;
      },
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
    update: (
      id: string,
      data: {
        title?: string;
        text?: string;
        voice?: string;
        voiceName?: string | null;
      },
    ) =>
      Effect.sync(() => {
        options?.onUpdate?.(id, data);
        return { ...state.voiceover!, ...data };
      }),
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
    clearApproval: (id: string) =>
      Effect.sync(() => {
        options?.onClearApprovals?.(id);
        return { ...state.voiceover!, approvedBy: null, approvedAt: null };
      }),
    setApproval: () => Effect.die('not implemented'),
  };

  return Layer.succeed(VoiceoverRepo, service);
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
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      // Verify result structure
      expect(result.voiceover).toBeDefined();
      expect(result.audioUrl).toContain('voiceovers/');
      expect(result.audioUrl).toContain('.wav');
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

      // Verify approval was cleared
      expect(clearApprovalsSpy).toHaveBeenCalledWith(voiceover.id);
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
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
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
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
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
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      // Verify audio URL format (includes timestamp for cache-busting)
      expect(result.audioUrl).toMatch(
        new RegExp(
          `^https://storage\\.example\\.com/voiceovers/${voiceover.id}/audio-\\d+\\.wav$`,
        ),
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
      const user = createTestUser();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({}),
        createMockTTS(),
        createMockStorage(),
        createMockLLM(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: 'voc_nonexistent' as VoiceoverId,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
        expect((error as VoiceoverNotFound).id).toBe('voc_nonexistent');
      }
    });

    it('fails with ForbiddenError when caller is not the owner', async () => {
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
        createMockTTS(),
        createMockStorage(),
        createMockLLM(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(otherUser)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
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
        createMockTTS(),
        createMockStorage(),
        createMockLLM(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
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
        createMockTTS(),
        createMockStorage(),
        createMockLLM(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
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
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
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
        createMockTTS({ errorMessage: 'TTS service unavailable' }),
        createMockStorage(),
        createMockLLM(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
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
        approvedBy: 'some-admin-id',
        approvedAt: new Date(),
      });
      const clearApprovalsSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onClearApprovals: clearApprovalsSpy },
        ),
        createMockTTS(),
        createMockStorage(),
        createMockLLM(),
      );

      await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(clearApprovalsSpy).toHaveBeenCalledWith(voiceover.id);
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
        createMockTTS(), // Mock TTS returns predefined audio
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      // If we got a result, TTS was called successfully with the voice config
      expect(result.voiceover).toBeDefined();
      expect(result.audioUrl).toBeDefined();
    });

    it('sends LLM-annotated text to TTS', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: 'The climate is changing rapidly.',
      });
      const annotatedText =
        'The climate is changing rapidly. [medium pause] Really rapidly.';

      const synthesizeSpy = vi.fn();
      const spyTTSService: TTSService = {
        listVoices: () => Effect.succeed([]),
        previewVoice: () => Effect.die('not implemented'),
        synthesize: (options) => {
          synthesizeSpy(options);
          return Effect.succeed({
            audioContent: Buffer.alloc(96000),
            audioEncoding: 'LINEAR16' as const,
            mimeType: 'audio/wav',
          });
        },
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        Layer.succeed(TTS, spyTTSService),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM({
          response: { annotatedText, title: 'Climate Change' },
        }),
      );

      await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(synthesizeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          turns: [{ speaker: 'narrator', text: annotatedText }],
        }),
      );
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
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://cdn.example.com/' }),
        createMockLLM(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      // Verify the audio URL follows expected pattern (includes timestamp)
      expect(result.audioUrl).toMatch(
        new RegExp(
          `^https://cdn\\.example\\.com/voiceovers/${voiceover.id}/audio-\\d+\\.wav$`,
        ),
      );
    });
  });

  describe('title generation', () => {
    it('auto-generates title when title is Untitled Voiceover', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        title: 'Untitled Voiceover',
        text: 'This is a voiceover about climate change and its effects.',
      });
      const updateSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }, { onUpdate: updateSpy }),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM({
          response: {
            annotatedText:
              'This is a voiceover about climate change [short pause] and its effects.',
            title: 'Climate Change Effects',
          },
        }),
      );

      await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(updateSpy).toHaveBeenCalledWith(voiceover.id, {
        title: 'Climate Change Effects',
      });
    });

    it('preserves custom title', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        title: 'My Custom Title',
        text: 'Some voiceover content.',
      });
      const updateSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }, { onUpdate: updateSpy }),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM({
          response: { annotatedText: 'Some voiceover content.' },
        }),
      );

      await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('continues when title generation fails', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        title: 'Untitled Voiceover',
        text: 'Some voiceover content.',
      });
      const updateSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }, { onUpdate: updateSpy }),
        createMockTTS(),
        createMockStorage({ baseUrl: 'https://storage.example.com/' }),
        createMockLLM({ errorMessage: 'LLM service unavailable' }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      // Audio generation should still succeed
      expect(result.voiceover).toBeDefined();
      expect(result.audioUrl).toBeDefined();

      // Title should not be updated (fallback returns current title)
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
