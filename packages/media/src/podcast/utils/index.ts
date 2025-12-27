/**
 * Podcast Utilities
 *
 * Helper functions for state management and transitions.
 */

export {
  calculateSteps,
  isValidTransition,
  determineNewVersionStatus,
  detectEditType,
  canRegenerate,
  isTerminalState,
  isGenerating,
  getStatusDescription,
  STATUS_ORDER,
  GENERATING_STATES,
  FAILED_STATE,
  type GenerationStep,
  type EditType,
} from './state-machine';
