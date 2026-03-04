export * from './user';
export * from './source';
export * from './podcast';
export * from './infographic';
export * from './voiceover';

import {
  resetInfographicCounter,
  resetInfographicVersionCounter,
} from './infographic';
import { resetPodcastCounters } from './podcast';
import { resetSourceCounter } from './source';
import { resetUserCounter } from './user';
import { resetVoiceoverCounter } from './voiceover';

/**
 * Reset all factory counters.
 * Call this in beforeEach for consistent test IDs.
 */
export function resetAllFactories() {
  resetUserCounter();
  resetSourceCounter();
  resetPodcastCounters();
  resetInfographicCounter();
  resetInfographicVersionCounter();
  resetVoiceoverCounter();
}
