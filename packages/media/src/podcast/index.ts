// Repositories
export {
  PodcastRepo,
  PodcastRepoLive,
  type PodcastRepoService,
  type PodcastWithDocuments,
  type ListOptions,
  type UpdateScriptOptions,
  type UpdateAudioOptions,
} from './repos';

// Use Cases
export {
  createPodcast,
  getPodcast,
  updatePodcast,
  deletePodcast,
  listPodcasts,
  saveChanges,
  generateScript,
  generateAudio,
  startGeneration,
  saveAndQueueAudio,
  getJob,
  InvalidAudioGenerationError,
  InvalidSaveError,
  NoChangesToSaveError,
  approvePodcast,
  revokeApproval,
  type CreatePodcastInput,
  type GetPodcastInput,
  type UpdatePodcastInput,
  type DeletePodcastInput,
  type ListPodcastsInput,
  type ListPodcastsResult,
  type SaveChangesInput,
  type SaveChangesResult,
  type GenerateScriptInput,
  type GenerateScriptResult,
  type GenerateAudioInput,
  type GenerateAudioResult,
  type StartGenerationInput,
  type StartGenerationResult,
  type SaveAndQueueAudioInput,
  type SaveAndQueueAudioResult,
  type GetJobInput,
  type GetJobResult,
  type ApprovePodcastInput,
  type RevokeApprovalInput,
} from './use-cases';

// Prompts
export { buildSystemPrompt, buildUserPrompt } from './prompts';

// DB types
export type {
  Podcast,
  PodcastFormat,
  CreatePodcast,
  UpdatePodcast,
  Document,
  VersionStatus,
  ScriptSegment,
} from '@repo/db/schema';
