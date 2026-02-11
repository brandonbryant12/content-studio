// features/voiceovers/components/index.ts

// Container/Presenter pattern components - List
export { VoiceoverListContainer } from './voiceover-list-container';
export { VoiceoverList, type VoiceoverListProps } from './voiceover-list';
export {
  VoiceoverItem,
  type VoiceoverItemProps,
  type VoiceoverListItem,
} from './voiceover-item';

// Container/Presenter pattern components - Detail
export { VoiceoverDetailContainer } from './voiceover-detail-container';
export { VoiceoverDetail, type VoiceoverDetailProps } from './voiceover-detail';

// Reusable components
export { VoiceoverIcon } from './voiceover-icon';

// Collaborator components
export {
  CollaboratorAvatars,
  type CollaboratorAvatarsProps,
  AddCollaboratorDialog,
  CollaboratorList,
  type CollaboratorListProps,
} from './collaborators';
