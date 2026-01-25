// features/podcasts/index.ts
// Feature barrel - specific exports only to prevent bundle bloat
// See: .claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md

// Status utilities
export {
  VersionStatus,
  type VersionStatusType,
  VERSION_STATUS_CONFIG,
  isGeneratingStatus,
  isActionDisabled,
  isReadyStatus,
  getStatusConfig,
  isSetupMode,
} from './lib/status';

// Query hooks
export { usePodcast, getPodcastQueryKey } from './hooks/use-podcast';
export {
  usePodcastList,
  useSuspensePodcastList,
  getPodcastListQueryKey,
  usePodcastsOrdered,
} from './hooks/use-podcast-list';

// Mutation hooks
export { useOptimisticGeneration } from './hooks/use-optimistic-generation';
export { useOptimisticSaveChanges } from './hooks/use-optimistic-save-changes';
export { useOptimisticDelete } from './hooks/use-optimistic-delete';
export { useOptimisticCreate } from './hooks/use-optimistic-create';
export { useOptimisticDeleteList } from './hooks/use-optimistic-delete-list';

// Local state hooks
export {
  useScriptEditor,
  type ScriptSegment,
  type UseScriptEditorReturn,
} from './hooks/use-script-editor';
export {
  usePodcastSettings,
  VOICES,
  MIN_DURATION,
  MAX_DURATION,
  type UsePodcastSettingsReturn,
} from './hooks/use-podcast-settings';
export {
  useDocumentSelection,
  type DocumentInfo,
  type UseDocumentSelectionReturn,
} from './hooks/use-document-selection';
export {
  usePodcastGeneration,
  type UsePodcastGenerationReturn,
} from './hooks/use-podcast-generation';

// Collaborator hooks
export {
  useCollaborators,
  useCollaboratorsQuery,
  getCollaboratorsQueryKey,
  type Collaborator,
} from './hooks/use-collaborators';
export { useAddCollaborator } from './hooks/use-add-collaborator';
export { useRemoveCollaborator } from './hooks/use-remove-collaborator';
export { useApprovePodcast } from './hooks/use-approve-podcast';

// Container components
export { PodcastDetailContainer } from './components/podcast-detail-container';
export { PodcastListContainer } from './components/podcast-list-container';
export { SetupWizardContainer } from './components/setup-wizard-container';

// Presenter components
export {
  PodcastDetail,
  type PodcastDetailProps,
} from './components/podcast-detail';
export { PodcastList, type PodcastListProps } from './components/podcast-list';
export {
  PodcastItem,
  type PodcastItemProps,
  type PodcastListItem,
} from './components/podcast-item';

// Reusable components
export { AudioPlayer } from './components/audio-player';
export { PodcastIcon } from './components/podcast-icon';
