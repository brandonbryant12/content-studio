import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  createTestPodcastScript,
  createTestDocument,
  resetPodcastCounters,
  resetAllFactories,
} from '@repo/testing';
import type {
  Podcast,
  PodcastScript,
  Document,
  CreatePodcast,
  DocumentId,
} from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { DocumentNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import {
  ScriptVersionRepo,
  type ScriptVersionRepoService,
  type CreateScriptVersion,
} from '../../repos/script-version-repo';
import { createPodcast } from '../create-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockRepoState {
  documents: Document[];
  insertedPodcast?: Podcast;
  insertedVersion?: PodcastScript;
}

/**
 * Create a mock PodcastRepo layer with custom behavior.
 */
const createMockPodcastRepo = (
  state: MockRepoState,
  options?: {
    onInsert?: (
      data: Omit<CreatePodcast, 'documentIds'> & { createdBy: string },
      documentIds: readonly string[],
    ) => void;
    verifyDocumentsError?: DocumentNotFound;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    findById: () => Effect.die('not implemented'),
    findByIdFull: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    listWithActiveVersionSummary: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),

    insert: (data, documentIds) =>
      Effect.sync(() => {
        options?.onInsert?.(data, documentIds);
        const podcast =
          state.insertedPodcast ??
          createTestPodcast({
            title: data.title,
            description: data.description,
            format: data.format,
            hostVoice: data.hostVoice,
            coHostVoice: data.coHostVoice,
            promptInstructions: data.promptInstructions,
            targetDurationMinutes: data.targetDurationMinutes,
            createdBy: data.createdBy,
            sourceDocumentIds: [...documentIds],
          });
        const docs = state.documents.filter((d) => documentIds.includes(d.id));
        const result: PodcastWithDocuments = {
          ...podcast,
          documents: docs,
        };
        return result;
      }),

    verifyDocumentsExist: (documentIds, _userId) =>
      Effect.suspend(() => {
        if (options?.verifyDocumentsError) {
          return Effect.fail(options.verifyDocumentsError);
        }
        const docs = state.documents.filter((d) => documentIds.includes(d.id));
        return Effect.succeed(docs);
      }),
  };

  return Layer.succeed(PodcastRepo, service);
};

/**
 * Create a mock ScriptVersionRepo layer.
 */
const createMockScriptVersionRepo = (
  state: MockRepoState,
  options?: {
    onInsert?: (data: CreateScriptVersion) => void;
  },
): Layer.Layer<ScriptVersionRepo> => {
  const service: ScriptVersionRepoService = {
    findById: () => Effect.die('not implemented'),
    findActiveByPodcastId: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    deactivateAll: () => Effect.die('not implemented'),
    getNextVersion: () => Effect.die('not implemented'),

    insert: (data) =>
      Effect.sync(() => {
        options?.onInsert?.(data);
        return (
          state.insertedVersion ??
          createTestPodcastScript({
            podcastId: data.podcastId as any,
            createdBy: data.createdBy,
            status: data.status,
            segments: data.segments,
            isActive: true,
            version: 1,
          })
        );
      }),
  };

  return Layer.succeed(ScriptVersionRepo, service);
};

/**
 * Create a mock Db layer.
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

// =============================================================================
// Tests
// =============================================================================

describe('createPodcast', () => {
  beforeEach(() => {
    resetPodcastCounters();
    resetAllFactories();
  });

  describe('podcast creation', () => {
    it('creates podcast with correct metadata', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const mockPodcastRepo = createMockPodcastRepo(
        { documents: [] },
        { onInsert: insertSpy },
      );
      const mockScriptVersionRepo = createMockScriptVersionRepo({
        documents: [],
      });
      const layers = Layer.mergeAll(
        MockDbLive,
        mockPodcastRepo,
        mockScriptVersionRepo,
      );

      const result = await Effect.runPromise(
        createPodcast({
          format: 'conversation',
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.format).toBe('conversation');
      expect(insertSpy).toHaveBeenCalledOnce();
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'conversation',
          createdBy: user.id,
        }),
        [],
      );
    });

    it('creates podcast with custom settings', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const mockPodcastRepo = createMockPodcastRepo(
        { documents: [] },
        { onInsert: insertSpy },
      );
      const mockScriptVersionRepo = createMockScriptVersionRepo({
        documents: [],
      });
      const layers = Layer.mergeAll(
        MockDbLive,
        mockPodcastRepo,
        mockScriptVersionRepo,
      );

      await Effect.runPromise(
        createPodcast({
          format: 'conversation',
          title: 'Custom Title',
          description: 'Custom Description',
          hostVoice: 'Puck',
          coHostVoice: 'Aoede',
          promptInstructions: 'Be casual',
          targetDurationMinutes: 15,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'conversation',
          title: 'Custom Title',
          description: 'Custom Description',
          hostVoice: 'Puck',
          coHostVoice: 'Aoede',
          promptInstructions: 'Be casual',
          targetDurationMinutes: 15,
          createdBy: user.id,
        }),
        [],
      );
    });
  });

  describe('document handling', () => {
    it('creates podcast with document IDs', async () => {
      const user = createTestUser();
      const doc1 = createTestDocument({ createdBy: user.id });
      const doc2 = createTestDocument({ createdBy: user.id });
      const insertSpy = vi.fn();

      const mockPodcastRepo = createMockPodcastRepo(
        { documents: [doc1, doc2] },
        { onInsert: insertSpy },
      );
      const mockScriptVersionRepo = createMockScriptVersionRepo({
        documents: [doc1, doc2],
      });
      const layers = Layer.mergeAll(
        MockDbLive,
        mockPodcastRepo,
        mockScriptVersionRepo,
      );

      const result = await Effect.runPromise(
        createPodcast({
          format: 'conversation',
          documentIds: [doc1.id, doc2.id],
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.documents).toHaveLength(2);
      expect(insertSpy).toHaveBeenCalledWith(expect.anything(), [
        doc1.id,
        doc2.id,
      ]);
    });

    it('verifies documents exist before creating podcast', async () => {
      const user = createTestUser();
      const doc = createTestDocument({ createdBy: user.id });
      const verifyError = new DocumentNotFound({ id: 'doc_missing' });

      const mockPodcastRepo = createMockPodcastRepo(
        { documents: [doc] },
        { verifyDocumentsError: verifyError },
      );
      const mockScriptVersionRepo = createMockScriptVersionRepo({
        documents: [doc],
      });
      const layers = Layer.mergeAll(
        MockDbLive,
        mockPodcastRepo,
        mockScriptVersionRepo,
      );

      const result = await Effect.runPromiseExit(
        createPodcast({
          format: 'conversation',
          documentIds: ['doc_missing' as DocumentId],
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(DocumentNotFound);
        expect((error as DocumentNotFound).id).toBe('doc_missing');
      }
    });

    it('skips document verification when no documentIds provided', async () => {
      const user = createTestUser();

      const mockPodcastRepo = createMockPodcastRepo({ documents: [] });
      const mockScriptVersionRepo = createMockScriptVersionRepo({
        documents: [],
      });
      const layers = Layer.mergeAll(
        MockDbLive,
        mockPodcastRepo,
        mockScriptVersionRepo,
      );

      const result = await Effect.runPromise(
        createPodcast({
          format: 'conversation',
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      // Should succeed without document verification
      expect(result.documents).toHaveLength(0);
    });
  });

  describe('initial version creation', () => {
    it('creates initial drafting version', async () => {
      const user = createTestUser();
      const versionInsertSpy = vi.fn();

      const mockPodcastRepo = createMockPodcastRepo({ documents: [] });
      const mockScriptVersionRepo = createMockScriptVersionRepo(
        { documents: [] },
        { onInsert: versionInsertSpy },
      );
      const layers = Layer.mergeAll(
        MockDbLive,
        mockPodcastRepo,
        mockScriptVersionRepo,
      );

      await Effect.runPromise(
        createPodcast({
          format: 'conversation',
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(versionInsertSpy).toHaveBeenCalledOnce();
      expect(versionInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: user.id,
          status: 'drafting',
          segments: null,
        }),
      );
    });

    it('returns podcast with active version', async () => {
      const user = createTestUser();
      const insertedVersion = createTestPodcastScript({
        status: 'drafting',
        isActive: true,
        createdBy: user.id,
      });

      const mockPodcastRepo = createMockPodcastRepo({ documents: [] });
      const mockScriptVersionRepo = createMockScriptVersionRepo({
        documents: [],
        insertedVersion,
      });
      const layers = Layer.mergeAll(
        MockDbLive,
        mockPodcastRepo,
        mockScriptVersionRepo,
      );

      const result = await Effect.runPromise(
        createPodcast({
          format: 'conversation',
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.activeVersion).not.toBeNull();
      expect(result.activeVersion?.status).toBe('drafting');
      expect(result.activeVersion?.id).toBe(insertedVersion.id);
    });
  });
});
