import { Layer } from 'effect';
import type { Db } from '@repo/db/effect';
import type { Storage } from '@repo/storage';

export {
  DocumentNotFound,
  DocumentError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
  DocumentParseError,
  UrlFetchError,
  InvalidUrlError,
  DocumentAlreadyProcessing,
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
  type MediaError,
} from './errors';

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
  DocumentRepo,
  DocumentRepoLive,
  type DocumentRepoService,
  type ListOptions as DocumentListOptions,
} from './document';

export {
  listDocuments,
  getDocument,
  getDocumentContent,
  createDocument,
  uploadDocument,
  updateDocument,
  deleteDocument,
  createFromUrl,
  retryProcessing,
  type ListDocumentsInput,
  type ListDocumentsResult,
  type GetDocumentInput,
  type GetDocumentContentInput,
  type GetDocumentContentResult,
  type CreateDocumentInput,
  type UploadDocumentInput,
  type UpdateDocumentInput,
  type DeleteDocumentInput,
  type CreateFromUrlInput,
  type RetryProcessingInput,
  type ProcessResearchPayload,
} from './document';

export {
  UrlScraper,
  UrlScraperLive,
  type UrlScraperService,
  type ScrapedContent,
} from './document';

export {
  parseUploadedFile,
  parseDocumentContent,
  validateFileSize,
  validateMimeType,
  getMimeType,
  extractTitleFromFileName,
  MAX_FILE_SIZE,
  SUPPORTED_MIME_TYPES,
  EXTENSION_TO_MIME,
  type ParsedDocument,
  type FileUploadInput,
  type InsertDocumentInput,
  type UpdateDocumentInput as RepoUpdateDocumentInput,
  type Document,
  type CreateDocument,
  type UpdateDocument,
  type DocumentSource,
} from './document';

export {
  PodcastRepo,
  PodcastRepoLive,
  type PodcastRepoService,
  type PodcastWithDocuments,
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
} from './infographic';

export type {
  Infographic,
  InfographicType,
  InfographicStyle,
  InfographicFormat,
  InfographicStatusType,
  InfographicOutput,
  InfographicVersion,
  InfographicVersionOutput,
} from './infographic';

import type { DocumentRepo} from './document';
import { ActivityLogRepoLive } from './activity';
import { DocumentRepoLive } from './document';
import type { PodcastRepo} from './podcast';
import { InfographicRepoLive } from './infographic';
import { PodcastRepoLive } from './podcast';
import type { VoiceoverRepo} from './voiceover';
import { VoiceoverRepoLive } from './voiceover';
import type { InfographicRepo} from './infographic';
import type { ActivityLogRepo} from './activity';

// When adding a new repo, add it to both Media and MediaLive.
export type Media =
  | DocumentRepo
  | PodcastRepo
  | VoiceoverRepo
  | InfographicRepo
  | ActivityLogRepo;

export const MediaLive: Layer.Layer<Media, never, Db | Storage> =
  Layer.mergeAll(
    DocumentRepoLive,
    PodcastRepoLive,
    VoiceoverRepoLive,
    InfographicRepoLive,
    ActivityLogRepoLive,
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
