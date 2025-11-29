// Types and errors
export * from './errors';

// Service interface (CRUD operations)
export {
  Podcasts,
  type PodcastService,
  type PodcastWithDocuments,
  type PodcastWithScript,
  type PodcastFull,
} from './service';

// Live implementation (CRUD)
export { PodcastsLive } from './live';

// Generator service (script + audio generation)
export { PodcastGenerator, type PodcastGeneratorService, type GenerationError } from './generator';
export { PodcastGeneratorLive } from './generator-live';

// Re-export DB types for convenience
export type {
  Podcast,
  PodcastDocument,
  PodcastScript,
  PodcastFormat,
  PodcastStatus,
  CreatePodcast,
  UpdatePodcast,
  UpdateScript,
  ScriptSegment,
} from '@repo/db/schema';
