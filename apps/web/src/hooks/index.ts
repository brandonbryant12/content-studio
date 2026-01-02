// Re-export from features for backward compatibility
// TODO: Update imports to use @/features/podcasts/hooks directly, then remove this file

export {
  useSessionGuard,
  type UseSessionGuardReturn,
} from './use-session-guard';

// Re-export from features/podcasts/hooks
export {
  usePodcastGeneration,
  type UsePodcastGenerationReturn,
  useScriptEditor,
  type ScriptSegment,
  type UseScriptEditorReturn,
  usePodcastSettings,
  VOICES,
  MIN_DURATION,
  MAX_DURATION,
  type UsePodcastSettingsReturn,
  useDocumentSelection,
  type UseDocumentSelectionReturn,
  type DocumentInfo,
  useOptimisticGeneration,
  useOptimisticSaveChanges,
  useOptimisticDelete,
  usePodcast,
  usePodcastList,
  useSuspensePodcastList,
} from '@/features/podcasts/hooks';

// Legacy exports - these are now replaced by factory-based hooks
export {
  useOptimisticFullGeneration,
  useOptimisticSaveChanges as useOptimisticSaveChangesLegacy,
} from './use-optimistic-podcast-mutation';
