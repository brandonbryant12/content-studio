// Errors
export {
  SourceNotFound,
  SourceError,
  SourceTooLargeError,
  UnsupportedSourceFormat,
  SourceParseError,
  SourceContentNotFound,
} from '../errors';

// Repository (Context.Tag pattern)
export {
  SourceRepo,
  SourceRepoLive,
  type SourceRepoService,
  type ListOptions,
  type InsertSourceInput,
  type UpdateSourceInput,
} from './repos';

// Use cases
export * from './use-cases';

// Services
export { calculateContentHash } from './services/content-utils';
export {
  DeepResearchFeature,
  DeepResearchFeatureLive,
  ensureDeepResearchEnabled,
  type DeepResearchFeatureService,
} from './services/deep-research-feature';
export { validateUrl } from './services/url-validator';
export {
  UrlScraper,
  type UrlScraperService,
  type ScrapedContent,
} from './services/url-scraper';
export { UrlScraperLive } from './services/url-scraper-impl';

// Parsers (for direct use if needed)
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
} from './parsers';

// Re-export DB types for convenience
export type {
  Source,
  CreateSource,
  UpdateSource,
  SourceOrigin,
} from '@repo/db/schema';
