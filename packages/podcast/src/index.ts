// Types and errors
export * from './errors';

// Service interface
export {
  Podcasts,
  type PodcastService,
  type PodcastWithDocuments,
  type PodcastWithScript,
  type PodcastFull,
} from './service';

// Live implementation
export { PodcastsLive } from './live';

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
