import { Layer } from 'effect';

export {
  SourceNotFound,
  SourceError,
  SourceTooLargeError,
  UnsupportedSourceFormat,
  SourceParseError,
  UrlFetchError,
  InvalidUrlError,
  SourceAlreadyProcessing,
  PodcastNotFound,
  PodcastError,
  ScriptNotFound,
  VoiceoverNotFound,
  VoiceoverError,
  InvalidVoiceoverAudioGeneration,
  ProjectNotFound,
  MediaNotFound,
  InfographicNotFound,
  NotInfographicOwner,
  InfographicError,
  AdminUserNotFound,
  PersonaNotFound,
  NotPersonaOwner,
  type MediaError,
} from './errors';

export {
  AdminRepo,
  AdminRepoLive,
  searchUsers,
  listUserEntities,
  getUserDetail,
  type AdminRepoService,
  type SearchUsersInput,
  type SearchUsersResult,
  type ListUserEntitiesInput,
  type ListUserEntitiesResult,
  type GetUserDetailInput,
  type GetUserDetailResult,
  type UserEntityCounts,
  type UserRecentEntities,
  type UserAIUsageSummary,
} from './admin';

export {
  ActivityLogNotFound,
  ActivityLogRepo,
  ActivityLogRepoLive,
  logActivity,
  listActivity,
  getActivityStats,
  logEntityActivity,
  syncEntityTitle,
  type ActivityLogRepoService,
  type LogActivityInput,
  type ListActivityInput,
  type ListActivityResult,
  type GetActivityStatsInput,
  type ActivityStats,
} from './activity';

export {
  SourceRepo,
  SourceRepoLive,
  type SourceRepoService,
  type ListOptions as SourceListOptions,
} from './source';

export {
  listSources,
  getSource,
  getSourceContent,
  createSource,
  uploadSource,
  updateSource,
  deleteSource,
  createFromUrl,
  retryProcessing,
  type ListSourcesInput,
  type ListSourcesResult,
  type GetSourceInput,
  type GetSourceContentInput,
  type GetSourceContentResult,
  type CreateSourceInput,
  type UploadSourceInput,
  type UpdateSourceInput,
  type DeleteSourceInput,
  type CreateFromUrlInput,
  type RetryProcessingInput,
  createFromResearch,
  type CreateFromResearchInput,
  processUrl,
  type ProcessUrlInput,
  calculateContentHash,
  processResearch,
  type ProcessResearchInput,
  awaitSourcesReady,
  type AwaitSourcesReadyInput,
  SourcesNotReadyTimeout,
} from './source';

export {
  UrlScraper,
  UrlScraperLive,
  type UrlScraperService,
  type ScrapedContent,
} from './source';

export {
  parseUploadedFile,
  parseSourceContent,
  validateFileSize,
  validateMimeType,
  getMimeType,
  extractTitleFromFileName,
  MAX_FILE_SIZE,
  SUPPORTED_MIME_TYPES,
  EXTENSION_TO_MIME,
  type ParsedSource,
  type FileUploadInput,
  type InsertSourceInput,
  type UpdateSourceInput as RepoUpdateSourceInput,
  type Source,
  type CreateSource,
  type UpdateSource,
  type SourceOrigin,
} from './source';

export {
  PodcastRepo,
  PodcastRepoLive,
  type PodcastRepoService,
  type PodcastWithSources,
  type ListOptions,
  type UpdateScriptOptions,
  type UpdateAudioOptions,
} from './podcast';

export {
  VoiceoverRepo,
  VoiceoverRepoLive,
  type VoiceoverRepoService,
  type VoiceoverListOptions,
  type VoiceoverUpdateAudioOptions,
} from './voiceover';

export type {
  Voiceover,
  VoiceoverStatus,
  CreateVoiceover,
  UpdateVoiceover,
  VoiceoverOutput,
  VoiceoverListItemOutput,
} from './voiceover';

export {
  InfographicRepo,
  InfographicRepoLive,
  type InfographicRepoService,
  type InfographicListOptions,
  StylePresetRepo,
  StylePresetRepoLive,
  StylePresetNotFound,
  type StylePresetRepoService,
  type InsertStylePreset,
} from './infographic';

export {
  createInfographic,
  getInfographic,
  listInfographics,
  updateInfographic,
  deleteInfographic,
  generateInfographic,
  getInfographicVersions,
  getInfographicJob,
  approveInfographic,
  revokeInfographicApproval,
  type CreateInfographicInput,
  type GetInfographicInput,
  type ListInfographicsInput,
  type UpdateInfographicInput,
  type DeleteInfographicInput,
  type GenerateInfographicInput,
  type GetInfographicVersionsInput,
  type GetInfographicJobInput,
  type ApproveInfographicInput,
  type RevokeInfographicApprovalInput,
  executeInfographicGeneration,
  type ExecuteGenerationInput,
  type ExecuteGenerationResult,
  listStylePresets,
  createStylePreset,
  type CreateStylePresetInput,
  deleteStylePreset,
  type DeleteStylePresetInput,
} from './infographic';

export type {
  Infographic,
  InfographicFormat,
  InfographicStatusType,
  InfographicOutput,
  InfographicVersion,
  InfographicVersionOutput,
  StyleProperty,
} from './infographic';

export {
  PersonaRepo,
  PersonaRepoLive,
  type PersonaRepoService,
  type PersonaListOptions,
} from './persona';

export {
  createPersona,
  getPersona,
  listPersonas,
  updatePersona,
  deletePersona,
  generateAvatar,
  type CreatePersonaInput,
  type GetPersonaInput,
  type ListPersonasInput,
  type ListPersonasResult,
  type UpdatePersonaInput,
  type DeletePersonaInput,
  type GenerateAvatarInput,
} from './persona';

import type { ActivityLogRepo } from './activity';
import type { AdminRepo } from './admin';
import type { InfographicRepo } from './infographic';
import type { StylePresetRepo } from './infographic';
import type { PersonaRepo } from './persona';
import type { PodcastRepo } from './podcast';
import type { SourceRepo } from './source';
import type { VoiceoverRepo } from './voiceover';
import type { Db } from '@repo/db/effect';
import type { Storage } from '@repo/storage';
import { ActivityLogRepoLive } from './activity';
import { AdminRepoLive } from './admin';
import { InfographicRepoLive, StylePresetRepoLive } from './infographic';
import { PersonaRepoLive } from './persona';
import { PodcastRepoLive } from './podcast';
import { SourceRepoLive } from './source';
import { VoiceoverRepoLive } from './voiceover';

// When adding a new repo, add it to both Media and MediaLive.
export type Media =
  | AdminRepo
  | SourceRepo
  | PodcastRepo
  | VoiceoverRepo
  | InfographicRepo
  | StylePresetRepo
  | ActivityLogRepo
  | PersonaRepo;

export const MediaLive: Layer.Layer<Media, never, Db | Storage> =
  Layer.mergeAll(
    AdminRepoLive,
    SourceRepoLive,
    PodcastRepoLive,
    VoiceoverRepoLive,
    InfographicRepoLive,
    StylePresetRepoLive,
    ActivityLogRepoLive,
    PersonaRepoLive,
  );

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
  approvePodcast,
  revokeApproval,
  generateCoverImage,
  InvalidAudioGenerationError,
  InvalidSaveError,
  NoChangesToSaveError,
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
  type GenerateCoverImageInput,
} from './podcast';

export {
  type Podcast,
  type PodcastFormat,
  type CreatePodcast,
  type UpdatePodcast,
  type VersionStatus,
  type ScriptSegment,
} from './podcast';

export {
  createVoiceover,
  getVoiceover,
  listVoiceovers,
  updateVoiceover,
  deleteVoiceover,
  generateVoiceoverAudio,
  startVoiceoverGeneration,
  getVoiceoverJob,
  approveVoiceover,
  revokeVoiceoverApproval,
  type CreateVoiceoverInput,
  type GetVoiceoverInput,
  type ListVoiceoversInput,
  type ListVoiceoversResult,
  type UpdateVoiceoverInput,
  type DeleteVoiceoverInput,
  type GenerateVoiceoverAudioInput,
  type GenerateVoiceoverAudioResult,
  type StartVoiceoverGenerationInput,
  type StartVoiceoverGenerationResult,
  type GetVoiceoverJobInput,
  type GetVoiceoverJobResult,
  type ApproveVoiceoverInput,
  type RevokeVoiceoverApprovalInput,
} from './voiceover';
