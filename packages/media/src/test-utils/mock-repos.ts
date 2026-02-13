import { Db } from '@repo/db/effect';
import { Effect, Layer } from 'effect';
import {
  ActivityLogRepo,
  type ActivityLogRepoService,
} from '../activity/repos/activity-log-repo';
import {
  DocumentRepo,
  type DocumentRepoService,
} from '../document/repos/document-repo';
import {
  InfographicRepo,
  type InfographicRepoService,
} from '../infographic/repos/infographic-repo';
import {
  PersonaRepo,
  type PersonaRepoService,
} from '../persona/repos/persona-repo';
import {
  PodcastRepo,
  type PodcastRepoService,
} from '../podcast/repos/podcast-repo';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../voiceover/repos/voiceover-repo';

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
    setApproval: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),
  };

  return Layer.succeed(PodcastRepo, { ...defaults, ...overrides });
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
    setApproval: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),
  };

  return Layer.succeed(VoiceoverRepo, { ...defaults, ...overrides });
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
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
    findOrphanedResearch: () => Effect.die('not implemented'),
  };

  return Layer.succeed(DocumentRepo, { ...defaults, ...overrides });
};

/**
 * Create a mock ActivityLogRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockActivityLogRepo = (
  overrides: Partial<ActivityLogRepoService> = {},
): Layer.Layer<ActivityLogRepo> => {
  const defaults: ActivityLogRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    countByEntityType: () => Effect.die('not implemented'),
    countByAction: () => Effect.die('not implemented'),
    countByUser: () => Effect.die('not implemented'),
    countTotal: () => Effect.die('not implemented'),
    updateEntityTitle: () => Effect.die('not implemented'),
  };

  return Layer.succeed(ActivityLogRepo, { ...defaults, ...overrides });
};

/**
 * Create a mock InfographicRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockInfographicRepo = (
  overrides: Partial<InfographicRepoService> = {},
): Layer.Layer<InfographicRepo> => {
  const defaults: InfographicRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    insertVersion: () => Effect.die('not implemented'),
    listVersions: () => Effect.die('not implemented'),
    deleteOldVersions: () => Effect.die('not implemented'),
    setApproval: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),
  };

  return Layer.succeed(InfographicRepo, { ...defaults, ...overrides });
};

/**
 * Create a mock PersonaRepo layer with `Effect.die('not implemented')` defaults.
 * Override individual methods by passing them in the overrides object.
 */
export const createMockPersonaRepo = (
  overrides: Partial<PersonaRepoService> = {},
): Layer.Layer<PersonaRepo> => {
  const defaults: PersonaRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
  };

  return Layer.succeed(PersonaRepo, { ...defaults, ...overrides });
};

/**
 * A no-op Db layer for tests that only test use-case logic.
 * The use cases access repos (not Db directly), so this provides
 * a dummy Db to satisfy the type requirements.
 */
export const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});
