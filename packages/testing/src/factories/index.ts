// User factories
export {
  createTestUser,
  createTestAdmin,
  resetUserCounter,
  type TestUser,
  type CreateTestUserOptions,
} from './user';
import { resetUserCounter as _resetUserCounter } from './user';

// Document factories
export {
  createTestDocument,
  createTestPdfDocument,
  resetDocumentCounter,
  type CreateTestDocumentOptions,
} from './document';
import { resetDocumentCounter as _resetDocumentCounter } from './document';

// Podcast factories
export {
  createTestPodcast,
  createReadyPodcast,
  createScriptReadyPodcast,
  resetPodcastCounters,
  DEFAULT_TEST_SEGMENTS,
  type CreateTestPodcastOptions,
} from './podcast';
import { resetPodcastCounters as _resetPodcastCounters } from './podcast';

// Collaborator factories
export {
  createTestCollaborator,
  createTestCollaboratorWithUser,
  resetCollaboratorCounter,
  type CreateTestCollaboratorOptions,
} from './collaborator';
import { resetCollaboratorCounter as _resetCollaboratorCounter } from './collaborator';

// Infographic factories
export {
  createTestInfographic,
  createReadyInfographic,
  createTestInfographicVersion,
  resetInfographicCounter,
  resetInfographicVersionCounter,
  type CreateTestInfographicOptions,
  type CreateTestInfographicVersionOptions,
} from './infographic';
import {
  resetInfographicCounter as _resetInfographicCounter,
  resetInfographicVersionCounter as _resetInfographicVersionCounter,
} from './infographic';

/**
 * Reset all factory counters.
 * Call this in beforeEach for consistent test IDs.
 */
export const resetAllFactories = () => {
  _resetUserCounter();
  _resetDocumentCounter();
  _resetPodcastCounters();
  _resetCollaboratorCounter();
  _resetInfographicCounter();
  _resetInfographicVersionCounter();
};
