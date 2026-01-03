// features/podcasts/components/index.ts

// Container/Presenter pattern components - Detail
export { PodcastDetailContainer } from './podcast-detail-container';
export { PodcastDetail, type PodcastDetailProps } from './podcast-detail';
export { SetupWizardContainer } from './setup-wizard-container';

// Container/Presenter pattern components - List
export { PodcastListContainer } from './podcast-list-container';
export { PodcastList, type PodcastListProps } from './podcast-list';
export {
  PodcastItem,
  type PodcastItemProps,
  type PodcastListItem,
} from './podcast-item';

// Reusable components
export { AudioPlayer } from './audio-player';
export { PodcastIcon } from './podcast-icon';

// Workbench components
export * from './workbench';

// Setup wizard components
export * from './setup';
