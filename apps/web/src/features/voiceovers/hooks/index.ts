// features/voiceovers/hooks/index.ts

export {
  useVoiceoverList,
  useSuspenseVoiceoverList,
  getVoiceoverListQueryKey,
  useVoiceoversOrdered,
} from './use-voiceover-list';

export { useOptimisticCreate } from './use-optimistic-create';

export { useOptimisticDeleteList } from './use-optimistic-delete-list';

export { useOptimisticGeneration } from './use-optimistic-generation';

export { useVoiceover, getVoiceoverQueryKey } from './use-voiceover';

export {
  useVoiceoverSettings,
  VOICES,
  type UseVoiceoverSettingsReturn,
} from './use-voiceover-settings';

export {
  useCollaborators,
  useCollaboratorsQuery,
  getCollaboratorsQueryKey,
  type Collaborator,
} from './use-collaborators';

export { useAddCollaborator } from './use-add-collaborator';

export { useRemoveCollaborator } from './use-remove-collaborator';

export { useApproveVoiceover } from './use-approve-voiceover';
