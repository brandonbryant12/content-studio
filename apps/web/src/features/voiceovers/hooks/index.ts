// features/voiceovers/hooks/index.ts

export {
  useVoiceoverList,
  useSuspenseVoiceoverList,
  getVoiceoverListQueryKey,
  useVoiceoversOrdered,
} from './use-voiceover-list';

export { useOptimisticCreate } from './use-optimistic-create';

export { useOptimisticDeleteList } from './use-optimistic-delete-list';

export { useVoiceover, getVoiceoverQueryKey } from './use-voiceover';

export {
  useVoiceoverSettings,
  VOICES,
  type UseVoiceoverSettingsReturn,
} from './use-voiceover-settings';
