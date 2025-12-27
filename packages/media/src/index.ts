// Re-export media errors from centralized error catalog
export {
  // Document errors
  DocumentNotFound,
  DocumentError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
  DocumentParseError,
  // Podcast errors
  PodcastNotFound,
  PodcastError,
  ScriptNotFound,
} from '@repo/effect/errors';

// Document module
export {
  Documents,
  DocumentsLive,
  type DocumentService,
  type UploadDocumentInput,
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
  type UpdateDocumentInput,
  type Document,
  type CreateDocument,
  type UpdateDocument,
  type DocumentSource,
} from './document';

// Podcast module - Repos
export {
  PodcastRepo,
  PodcastRepoLive,
  ScriptVersionRepo,
  ScriptVersionRepoLive,
  type PodcastRepoService,
  type ScriptVersionRepoService,
  type PodcastWithDocuments,
  type PodcastFull,
  type ListOptions,
  type VersionStatus,
} from './podcast';

// Podcast module - Use Cases
export {
  createPodcast,
  getPodcast,
  updatePodcast,
  deletePodcast,
  listPodcasts,
  editScript,
  restoreVersion,
  generateScript,
  generateAudio,
  progressTo,
  InvalidAudioGenerationError,
  InvalidProgressionError,
  type CreatePodcastInput,
  type GetPodcastInput,
  type UpdatePodcastInput,
  type UpdatePodcastResult,
  type DeletePodcastInput,
  type ListPodcastsInput,
  type ListPodcastsResult,
  type EditScriptInput,
  type EditScriptResult,
  type RestoreVersionInput,
  type RestoreVersionResult,
  type GenerateScriptInput,
  type GenerateScriptResult,
  type GenerateAudioInput,
  type GenerateAudioResult,
  type ProgressToInput,
  type ProgressToResult,
  type ScriptSegment,
} from './podcast';

// Podcast module - Utils & Types
export {
  calculateSteps,
  isValidTransition,
  determineNewVersionStatus,
  detectEditType,
  canRegenerate,
  isTerminalState,
  isGenerating,
  getStatusDescription,
  STATUS_ORDER,
  GENERATING_STATES,
  FAILED_STATE,
  type GenerationStep,
  type EditType,
  type Podcast,
  type PodcastScript,
  type PodcastFormat,
  type CreatePodcast,
  type UpdatePodcast,
} from './podcast';
