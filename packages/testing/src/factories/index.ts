export * from './user';
export * from './document';
export * from './podcast';
export * from './infographic';
export * from './voiceover';

import { resetDocumentCounter } from './document';
import {
  resetInfographicCounter,
  resetInfographicVersionCounter,
} from './infographic';
import { resetPodcastCounters } from './podcast';
import { resetUserCounter } from './user';
import { resetVoiceoverCounter } from './voiceover';

/**
 * Reset all factory counters.
 * Call this in beforeEach for consistent test IDs.
 */
export function resetAllFactories() {
  resetUserCounter();
  resetDocumentCounter();
  resetPodcastCounters();
  resetInfographicCounter();
  resetInfographicVersionCounter();
  resetVoiceoverCounter();
}
