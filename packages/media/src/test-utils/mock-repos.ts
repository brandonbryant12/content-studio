import { Effect, Layer } from 'effect';
import {
  PodcastRepo,
  type PodcastRepoService,
} from '../podcast/repos/podcast-repo';
import {
  CollaboratorRepo,
  type CollaboratorRepoService,
} from '../podcast/repos/collaborator-repo';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../voiceover/repos/voiceover-repo';
import {
  VoiceoverCollaboratorRepo,
  type VoiceoverCollaboratorRepoService,
} from '../voiceover/repos/voiceover-collaborator-repo';
import {
  DocumentRepo,
  type DocumentRepoService,
} from '../document/repos/document-repo';
import { Db } from '@repo/db/effect';

// =============================================================================
// Mock Repo Factories
// =============================================================================

/**
 * Create a mock PodcastRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 *
 * @example
 * ```ts
 * const mockRepo = createMockPodcastRepo({
 *   findById: (id) => Effect.succeed({ ...testPodcast, documents: [] }),
 *   delete: (id) => Effect.succeed(true),
 * });
 * ```
 */
export const createMockPodcastRepo = (
  overrides: Partial<PodcastRepoService> = {},
): Layer.Layer<PodcastRepo> => {
  const defaults: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApprovals: () => Effect.die('not implemented'),
    setOwnerApproval: () => Effect.die('not implemented'),
  };

  return Layer.succeed(PodcastRepo, { ...defaults, ...overrides });
};

/**
 * Create a mock CollaboratorRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 *
 * @example
 * ```ts
 * const mockRepo = createMockCollaboratorRepo({
 *   findByPodcast: (podcastId) => Effect.succeed([]),
 *   add: (data) => Effect.succeed(testCollaborator),
 * });
 * ```
 */
export const createMockCollaboratorRepo = (
  overrides: Partial<CollaboratorRepoService> = {},
): Layer.Layer<CollaboratorRepo> => {
  const defaults: CollaboratorRepoService = {
    findById: () => Effect.die('not implemented'),
    findByPodcast: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByPodcastAndUser: () => Effect.die('not implemented'),
    findByPodcastAndEmail: () => Effect.die('not implemented'),
    lookupUserByEmail: () => Effect.die('not implemented'),
    add: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),
    approve: () => Effect.die('not implemented'),
    revokeApproval: () => Effect.die('not implemented'),
    clearAllApprovals: () => Effect.die('not implemented'),
    claimByEmail: () => Effect.die('not implemented'),
  };

  return Layer.succeed(CollaboratorRepo, { ...defaults, ...overrides });
};

/**
 * Create a mock VoiceoverRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 *
 * @example
 * ```ts
 * const mockRepo = createMockVoiceoverRepo({
 *   findById: (id) => Effect.succeed(testVoiceover),
 * });
 * ```
 */
export const createMockVoiceoverRepo = (
  overrides: Partial<VoiceoverRepoService> = {},
): Layer.Layer<VoiceoverRepo> => {
  const defaults: VoiceoverRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApprovals: () => Effect.die('not implemented'),
    setOwnerApproval: () => Effect.die('not implemented'),
  };

  return Layer.succeed(VoiceoverRepo, { ...defaults, ...overrides });
};

/**
 * Create a mock VoiceoverCollaboratorRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 *
 * @example
 * ```ts
 * const mockRepo = createMockVoiceoverCollaboratorRepo({
 *   findByVoiceover: (id) => Effect.succeed([]),
 * });
 * ```
 */
export const createMockVoiceoverCollaboratorRepo = (
  overrides: Partial<VoiceoverCollaboratorRepoService> = {},
): Layer.Layer<VoiceoverCollaboratorRepo> => {
  const defaults: VoiceoverCollaboratorRepoService = {
    findById: () => Effect.die('not implemented'),
    findByVoiceover: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByVoiceoverAndUser: () => Effect.die('not implemented'),
    findByVoiceoverAndEmail: () => Effect.die('not implemented'),
    lookupUserByEmail: () => Effect.die('not implemented'),
    add: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),
    approve: () => Effect.die('not implemented'),
    revokeApproval: () => Effect.die('not implemented'),
    clearAllApprovals: () => Effect.die('not implemented'),
    claimByEmail: () => Effect.die('not implemented'),
  };

  return Layer.succeed(VoiceoverCollaboratorRepo, {
    ...defaults,
    ...overrides,
  });
};

/**
 * Create a mock DocumentRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 *
 * @example
 * ```ts
 * const mockRepo = createMockDocumentRepo({
 *   findById: (id) => Effect.succeed(testDocument),
 *   list: (options) => Effect.succeed([testDocument]),
 * });
 * ```
 */
export const createMockDocumentRepo = (
  overrides: Partial<DocumentRepoService> = {},
): Layer.Layer<DocumentRepo> => {
  const defaults: DocumentRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
  };

  return Layer.succeed(DocumentRepo, { ...defaults, ...overrides });
};

/**
 * A no-op Db layer for tests that only test use-case logic.
 * The use cases access repos (not Db directly), so this provides
 * a dummy Db to satisfy the type requirements.
 */
export const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});
