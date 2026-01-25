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

// Workbench components (specific exports, no barrel re-export)
export { WorkbenchLayout } from './workbench/workbench-layout';
export { ScriptPanel } from './workbench/script-panel';
export { ConfigPanel } from './workbench/config-panel';
export { ScriptEditor } from './workbench/script-editor';
export { SegmentItem } from './workbench/segment-item';
export { SegmentEditorDialog } from './workbench/segment-editor-dialog';
export { AddSegmentDialog } from './workbench/add-segment-dialog';
export { SmartActions } from './workbench/smart-actions';
export { GenerationStatus } from './workbench/generation-status';
export { ErrorDisplay } from './workbench/error-display';
export { DocumentManager } from './workbench/document-manager';
export { PodcastSettings } from './workbench/podcast-settings';
export { GlobalActionBar } from './workbench/global-action-bar';

// Setup wizard components (specific exports, no barrel re-export)
export { SetupWizard } from './setup/setup-wizard';
export { StepIndicator } from './setup/step-indicator';
export { SetupFooter } from './setup/setup-footer';
