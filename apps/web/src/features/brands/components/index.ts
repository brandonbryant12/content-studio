// features/brands/components/index.ts
// Barrel export for brand feature components

// Container components
export { BrandListContainer } from './brand-list-container';
export { BrandDetailContainer } from './brand-detail-container';

// Presenter components
export { BrandList, type BrandListProps } from './brand-list';
export { BrandDetail, type BrandDetailProps } from './brand-detail';
export {
  BrandItem,
  type BrandItemProps,
  type BrandListItem,
} from './brand-item';
export { BrandBuilder } from './brand-builder';

// Reusable components
export { BrandIcon } from './brand-icon';
export { BrandProgressIndicator, CompactProgress } from './brand-progress';
export { QuickReplies } from './quick-replies';

// Wizard components
export {
  BrandWizard,
  WizardContainer,
  WizardNav,
  WizardStep,
  AIAssistantPanel,
  type WizardContainerProps,
  type WizardNavProps,
  type WizardStepProps,
  type AIAssistantPanelProps,
  type QuickAction,
} from './brand-wizard';

// Step components
export {
  StepBasics,
  StepMission,
  StepValues,
  StepColors,
  StepVoice,
  StepPersonas,
  StepSegments,
  StepReview,
} from './brand-steps';

// Selectors
export { BrandSelector, type BrandSelectorOption } from './brand-selector';
export {
  PersonaSelector,
  type PersonaSelectorOption,
} from './persona-selector';
export {
  SegmentSelector,
  type SegmentSelectorOption,
} from './segment-selector';

// Input components
export {
  ColorPicker,
  ValueChips,
  PersonaCard,
  SegmentCard,
  type ColorPreset,
} from './brand-inputs';
