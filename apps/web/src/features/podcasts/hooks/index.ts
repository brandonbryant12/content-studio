// features/podcasts/hooks/index.ts
// Barrel export for podcast feature hooks

// Query hooks
export { usePodcast, getPodcastQueryKey } from './use-podcast';
export {
  usePodcastList,
  useSuspensePodcastList,
  getPodcastListQueryKey,
  usePodcastsOrdered,
} from './use-podcast-list';

// Optimistic mutation hooks (using factory)
export { useOptimisticGeneration } from './use-optimistic-generation';
export { useOptimisticSaveChanges } from './use-optimistic-save-changes';
export { useOptimisticDelete } from './use-optimistic-delete';
export { useOptimisticCreate } from './use-optimistic-create';
export { useOptimisticDeleteList } from './use-optimistic-delete-list';

// Local state hooks
export {
  useScriptEditor,
  type ScriptSegment,
  type UseScriptEditorReturn,
} from './use-script-editor';
export {
  usePodcastSettings,
  VOICES,
  MIN_DURATION,
  MAX_DURATION,
  type UsePodcastSettingsReturn,
} from './use-podcast-settings';
export {
  useDocumentSelection,
  type DocumentInfo,
  type UseDocumentSelectionReturn,
} from './use-document-selection';
export {
  usePodcastGeneration,
  type UsePodcastGenerationReturn,
} from './use-podcast-generation';
