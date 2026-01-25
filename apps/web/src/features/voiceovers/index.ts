// features/voiceovers/index.ts
// Barrel exports kept minimal - prefer direct imports for better tree-shaking

// Components - re-export only what's commonly needed externally
export { VoiceoverListContainer } from './components/voiceover-list-container';
export { VoiceoverDetailContainer } from './components/voiceover-detail-container';
export { VoiceoverIcon } from './components/voiceover-icon';

// Hooks - re-export only what's commonly needed externally
export {
  useVoiceoverList,
  useSuspenseVoiceoverList,
  getVoiceoverListQueryKey,
} from './hooks/use-voiceover-list';
export { useVoiceover, getVoiceoverQueryKey } from './hooks/use-voiceover';

// Status utilities
export {
  VoiceoverStatus,
  getStatusConfig,
  isGeneratingStatus,
  type VoiceoverStatusType,
} from './lib/status';
