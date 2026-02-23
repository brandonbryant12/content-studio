export {
  SlideDeckRepo,
  SlideDeckRepoLive,
  type SlideDeckRepoService,
  type InsertSlideDeck,
  type UpdateSlideDeck as RepoUpdateSlideDeck,
  type InsertSlideDeckVersion,
  type ListOptions as SlideDeckListOptions,
} from './repos';

export {
  createSlideDeck,
  getSlideDeck,
  listSlideDecks,
  updateSlideDeck,
  deleteSlideDeck,
  generateSlideDeck,
  getSlideDeckJob,
  getSlideDeckVersions,
  executeSlideDeckGeneration,
  type CreateSlideDeckInput,
  type GetSlideDeckInput,
  type ListSlideDecksInput,
  type UpdateSlideDeckInput,
  type DeleteSlideDeckInput,
  type GenerateSlideDeckInput,
  type GenerateSlideDeckResult,
  type GetSlideDeckJobInput,
  type GetSlideDeckVersionsInput,
  type ExecuteSlideDeckGenerationInput,
  type ExecuteSlideDeckGenerationResult,
} from './use-cases';

export {
  sanitizeSlides,
  sanitizeSourceDocumentIds,
} from './sanitize';

export { renderSlideDeckHtml } from './render-html';

export type {
  SlideDeck,
  SlideDeckTheme,
  SlideDeckStatusType,
  SlideDeckOutput,
  SlideDeckVersion,
  SlideDeckVersionOutput,
  SlideContent,
} from '@repo/db/schema';
