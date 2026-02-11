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
  type UseVoiceoverSettingsReturn,
} from './use-voiceover-settings';
// Note: VOICES exported from lib/voices.ts

export { useApproveVoiceover } from './use-approve-voiceover';

export {
  useVoiceoverActions,
  type UseVoiceoverActionsReturn,
} from './use-voiceover-actions';
