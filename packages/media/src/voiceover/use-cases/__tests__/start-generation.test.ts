import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestUser, resetAllFactories } from '@repo/testing';
import type {
  Voiceover,
  JobId,
  JobStatus,
  VoiceoverId,
  VoiceoverStatus,
} from '@repo/db/schema';
import { generateVoiceoverId } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import {
  VoiceoverNotFound,
  NotVoiceoverOwner,
  InvalidVoiceoverAudioGeneration,
} from '../../../errors';
import { Queue, type QueueService, type Job } from '@repo/queue';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../../repos/voiceover-repo';
import {
  VoiceoverCollaboratorRepo,
  type VoiceoverCollaboratorRepoService,
} from '../../repos/voiceover-collaborator-repo';
import { startVoiceoverGeneration } from '../start-generation';

// =============================================================================
// Test Factories
// =============================================================================

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
    id: options.id ?? generateVoiceoverId(),
    title: options.title ?? `Test Voiceover ${voiceoverCounter}`,
    text: options.text ?? `This is test voiceover text ${voiceoverCounter}.`,
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
// Test Setup
// =============================================================================

// Mock Db layer (required by repo types)
const MockDbLive = Layer.succeed(Db, { db: {} as never });

interface MockState {
  voiceover?: Voiceover;
  pendingJob?: Job | null;
}

const createMockVoiceoverRepo = (
  state: MockState,
  options?: {
    onUpdateStatus?: (id: string, status: VoiceoverStatus) => void;
    onClearApprovals?: (id: string) => void;
  },
): Layer.Layer<VoiceoverRepo> => {
  const service: VoiceoverRepoService = {
    findById: (id: string) =>
      Effect.suspend(() =>
        state.voiceover && state.voiceover.id === id
          ? Effect.succeed(state.voiceover)
          : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    insert: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateStatus: (id: string, status: VoiceoverStatus) =>
      Effect.sync(() => {
        options?.onUpdateStatus?.(id, status);
        return { ...state.voiceover!, status };
      }),
    updateAudio: () => Effect.die('not implemented'),
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
    claimByEmail: () => Effect.succeed(0),
  };

  return Layer.succeed(VoiceoverCollaboratorRepo, service);
};

const createMockQueue = (
  state: MockState,
  options?: {
    onEnqueue?: (type: string, payload: unknown, userId: string) => void;
  },
): Layer.Layer<Queue> => {
  const service: QueueService = {
    enqueue: (type, payload, userId) =>
      Effect.sync(() => {
        options?.onEnqueue?.(type, payload, userId);
        return {
          id: 'job_test123456789abc' as JobId,
          type,
          status: 'pending' as JobStatus,
          payload,
          result: null,
          error: null,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          startedAt: null,
          completedAt: null,
        };
      }),
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.succeed(state.pendingJob ?? null),
    findPendingJobForInfographic: () => Effect.succeed(null),
    deleteJob: () => Effect.die('not implemented'),
  };

  return Layer.succeed(Queue, service);
};

// =============================================================================
// Tests
// =============================================================================

describe('startVoiceoverGeneration', () => {
  beforeEach(() => {
    resetAllFactories();
    resetVoiceoverCounter();
  });

  describe('success cases', () => {
    it('enqueues job and returns jobId', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        text: 'Hello, this is a test voiceover.',
      });
      const enqueueSpy = vi.fn();
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onUpdateStatus: updateStatusSpy },
        ),
        createMockQueue({ voiceover }, { onEnqueue: enqueueSpy }),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromise(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_test123456789abc');
      expect(result.status).toBe('pending');
      expect(enqueueSpy).toHaveBeenCalledOnce();
      expect(enqueueSpy).toHaveBeenCalledWith(
        'generate-voiceover',
        expect.objectContaining({
          voiceoverId: voiceover.id,
          userId: user.id,
        }),
        user.id,
      );
    });

    it('updates voiceover status to generating_audio', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        status: 'drafting',
        text: 'Some text to generate.',
      });
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onUpdateStatus: updateStatusSpy },
        ),
        createMockQueue({ voiceover }),
        createMockCollaboratorRepo(),
      );

      await Effect.runPromise(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(updateStatusSpy).toHaveBeenCalledOnce();
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'generating_audio',
      );
    });

    it('clears all approvals when generation starts', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        ownerHasApproved: true,
        text: 'Text content for voiceover.',
      });
      const clearApprovalsSpy = vi.fn();
      const clearAllApprovalsSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          { onClearApprovals: clearApprovalsSpy },
        ),
        createMockQueue({ voiceover }),
        createMockCollaboratorRepo({
          onClearAllApprovals: clearAllApprovalsSpy,
        }),
      );

      await Effect.runPromise(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      // Owner approval should be cleared
      expect(clearApprovalsSpy).toHaveBeenCalledOnce();
      expect(clearApprovalsSpy).toHaveBeenCalledWith(voiceover.id);

      // Collaborator approvals should be cleared
      expect(clearAllApprovalsSpy).toHaveBeenCalledOnce();
      expect(clearAllApprovalsSpy).toHaveBeenCalledWith(voiceover.id);
    });
  });

  describe('idempotency', () => {
    it('returns existing pending job instead of creating new one', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        text: 'Some voiceover text.',
      });
      const existingJob: Job = {
        id: 'job_existing0000000' as JobId,
        type: 'generate-voiceover',
        status: 'pending',
        payload: { voiceoverId: voiceover.id },
        result: null,
        error: null,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
      };
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockQueue(
          { voiceover, pendingJob: existingJob },
          { onEnqueue: enqueueSpy },
        ),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromise(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_existing0000000');
      expect(result.status).toBe('pending');
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('returns existing processing job', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        text: 'Voiceover text.',
      });
      const existingJob: Job = {
        id: 'job_processing00000' as JobId,
        type: 'generate-voiceover',
        status: 'processing',
        payload: { voiceoverId: voiceover.id },
        result: null,
        error: null,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
      };
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockQueue(
          { voiceover, pendingJob: existingJob },
          { onEnqueue: enqueueSpy },
        ),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromise(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_processing00000');
      expect(result.status).toBe('processing');
      expect(enqueueSpy).not.toHaveBeenCalled();
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const user = createTestUser();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({}),
        createMockQueue({}),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromiseExit(
        startVoiceoverGeneration({
          voiceoverId: 'voc_nonexistent00000' as VoiceoverId,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
      }
    });

    it('fails with NotVoiceoverOwner when caller is not owner', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const otherUser = createTestUser({ id: 'other-user-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
        text: 'Some text.',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockQueue({ voiceover }),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromiseExit(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: otherUser.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NotVoiceoverOwner);
        if (error instanceof NotVoiceoverOwner) {
          expect(error.voiceoverId).toBe(voiceover.id);
          expect(error.userId).toBe(otherUser.id);
        }
      }
    });

    it('fails with InvalidVoiceoverAudioGeneration when text is empty', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        text: '', // Empty text
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockQueue({ voiceover }),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromiseExit(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidVoiceoverAudioGeneration);
        if (error instanceof InvalidVoiceoverAudioGeneration) {
          expect(error.voiceoverId).toBe(voiceover.id);
          expect(error.reason).toContain('no text');
        }
      }
    });

    it('fails with InvalidVoiceoverAudioGeneration when text is only whitespace', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        text: '   \n\t  ', // Whitespace only
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockQueue({ voiceover }),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromiseExit(
        startVoiceoverGeneration({
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
  });

  describe('edge cases', () => {
    it('handles voiceover with very long text', async () => {
      const user = createTestUser();
      const longText = 'This is a test sentence. '.repeat(1000);
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        text: longText,
      });
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo({ voiceover }),
        createMockQueue({ voiceover }, { onEnqueue: enqueueSpy }),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromise(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_test123456789abc');
      expect(enqueueSpy).toHaveBeenCalledOnce();
    });

    it('handles voiceover in ready status (regeneration)', async () => {
      const user = createTestUser();
      const voiceover = createTestVoiceover({
        createdBy: user.id,
        text: 'Some text.',
        status: 'ready',
        audioUrl: 'https://storage.example.com/audio.wav',
        duration: 120,
        ownerHasApproved: true,
      });
      const updateStatusSpy = vi.fn();
      const clearApprovalsSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(
          { voiceover },
          {
            onUpdateStatus: updateStatusSpy,
            onClearApprovals: clearApprovalsSpy,
          },
        ),
        createMockQueue({ voiceover }),
        createMockCollaboratorRepo(),
      );

      const result = await Effect.runPromise(
        startVoiceoverGeneration({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBeDefined();
      expect(updateStatusSpy).toHaveBeenCalledWith(
        voiceover.id,
        'generating_audio',
      );
      expect(clearApprovalsSpy).toHaveBeenCalled();
    });
  });
});
