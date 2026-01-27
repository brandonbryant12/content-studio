// Handlers
export { handleGeneratePodcast } from './handlers';
export { handleGenerateVoiceover } from './voiceover-handlers';

// Unified worker (recommended - handles all job types)
export {
  createUnifiedWorker,
  type UnifiedWorkerConfig,
} from './unified-worker';

// Base worker infrastructure
export {
  createWorker,
  makeJobUser,
  wrapJobError,
  createRetrySchedule,
  type BaseWorkerConfig,
  type Worker,
  type CreateWorkerOptions,
} from './base-worker';

// Legacy separate workers (kept for backwards compatibility)
export {
  createPodcastWorker,
  type PodcastWorkerConfig,
} from './podcast-worker';
export {
  createVoiceoverWorker,
  type VoiceoverWorkerConfig,
} from './voiceover-worker';
