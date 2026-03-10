// Repositories
export {
  PodcastRepo,
  PodcastRepoLive,
  type PodcastRepoService,
  type PodcastWithSources,
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
  generatePodcastPlan,
  generateAudio,
  startGeneration,
  saveAndQueueAudio,
  getJob,
  InvalidAudioGenerationError,
  InvalidSaveError,
  NoChangesToSaveError,
  approvePodcast,
  revokeApproval,
  generateCoverImage,
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
  type GeneratePodcastPlanInput,
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
  type GenerateCoverImageInput,
  PodcastPlanSourcesNotReadyError,
} from './use-cases';

// Prompts
export {
  buildSystemPrompt,
  buildUserPrompt,
  buildPlanSystemPrompt,
  buildPlanUserPrompt,
} from './prompts';

// DB types
export type {
  Podcast,
  PodcastFormat,
  CreatePodcast,
  UpdatePodcast,
  Source,
  VersionStatus,
  ScriptSegment,
  PodcastEpisodePlan,
  PodcastEpisodePlanSection,
} from '@repo/db/schema';
