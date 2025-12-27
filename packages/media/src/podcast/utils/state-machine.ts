import type { VersionStatus } from '@repo/db/schema';

// =============================================================================
// State Machine Types
// =============================================================================

/**
 * Generation steps that can be executed.
 */
export type GenerationStep = 'generate-script' | 'generate-audio';

/**
 * Types of edits that can trigger version transitions.
 */
export type EditType =
  | 'segments' // Edit script segments
  | 'voice' // Change voice configuration
  | 'prompt_or_docs' // Change prompt instructions or source documents
  | 'metadata'; // Title, description, tags only

/**
 * Valid status transitions for the state machine.
 */
export const STATUS_ORDER: VersionStatus[] = [
  'draft',
  'script_ready',
  'audio_ready',
];

/**
 * Intermediate states during generation.
 */
export const GENERATING_STATES: VersionStatus[] = ['generating_audio'];

/**
 * Terminal error state.
 */
export const FAILED_STATE: VersionStatus = 'failed';

// =============================================================================
// State Machine Functions
// =============================================================================

/**
 * Calculate the steps required to progress from one status to another.
 *
 * @example
 * calculateSteps('draft', 'audio_ready')
 * // Returns: ['generate-script', 'generate-audio']
 *
 * calculateSteps('script_ready', 'audio_ready')
 * // Returns: ['generate-audio']
 *
 * calculateSteps('audio_ready', 'audio_ready')
 * // Returns: [] (already at target)
 */
export const calculateSteps = (
  from: VersionStatus,
  to: VersionStatus,
): GenerationStep[] => {
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);

  // Cannot progress from failed state
  if (from === 'failed') {
    return [];
  }

  // Cannot progress from generating state (wait for completion)
  if (GENERATING_STATES.includes(from)) {
    return [];
  }

  // Already at or past target
  if (fromIdx >= toIdx || toIdx === -1) {
    return [];
  }

  const steps: GenerationStep[] = [];

  // Need script generation if starting from draft
  if (fromIdx < 1 && toIdx >= 1) {
    steps.push('generate-script');
  }

  // Need audio generation if targeting audio_ready
  if (fromIdx < 2 && toIdx >= 2) {
    steps.push('generate-audio');
  }

  return steps;
};

/**
 * Determine if a status transition is valid.
 *
 * Valid transitions:
 * - draft → script_ready (via generate-script)
 * - script_ready → generating_audio (via generate-audio start)
 * - generating_audio → audio_ready (on success)
 * - generating_audio → failed (on error)
 * - any → failed (on error)
 */
export const isValidTransition = (
  from: VersionStatus,
  to: VersionStatus,
): boolean => {
  // Can always transition to failed
  if (to === 'failed') return true;

  // Cannot transition from failed without creating new version
  if (from === 'failed') return false;

  // Valid forward transitions
  const validTransitions: Record<VersionStatus, VersionStatus[]> = {
    draft: ['script_ready', 'failed'],
    script_ready: ['generating_audio', 'failed'],
    generating_audio: ['audio_ready', 'failed'],
    audio_ready: ['failed'], // Can only fail from audio_ready
    failed: [], // Cannot transition from failed
  };

  return validTransitions[from]?.includes(to) ?? false;
};

/**
 * Determine the new version status based on what changed.
 *
 * Smart transitions:
 * - segments edit → script_ready (audio outdated)
 * - voice change → script_ready (need new audio)
 * - prompt/docs change → draft (need new script)
 * - metadata only → null (no new version needed)
 */
export const determineNewVersionStatus = (
  editType: EditType,
): VersionStatus | null => {
  switch (editType) {
    case 'segments':
      // Script changed, audio is now outdated
      return 'script_ready';

    case 'voice':
      // Same script, but need new audio with different voice
      return 'script_ready';

    case 'prompt_or_docs':
      // Source material changed, need full regeneration
      return 'draft';

    case 'metadata':
      // Just title/description/tags, no new version needed
      return null;
  }
};

/**
 * Detect what type of edit is being made based on changed fields.
 *
 * Priority: prompt_or_docs > voice > segments > metadata
 */
export const detectEditType = (changedFields: {
  segments?: boolean;
  hostVoice?: boolean;
  coHostVoice?: boolean;
  promptInstructions?: boolean;
  sourceDocumentIds?: boolean;
  title?: boolean;
  description?: boolean;
  tags?: boolean;
}): EditType => {
  // Check for prompt/docs changes first (highest priority)
  if (changedFields.promptInstructions || changedFields.sourceDocumentIds) {
    return 'prompt_or_docs';
  }

  // Check for voice changes
  if (changedFields.hostVoice || changedFields.coHostVoice) {
    return 'voice';
  }

  // Check for segment changes
  if (changedFields.segments) {
    return 'segments';
  }

  // Default to metadata
  return 'metadata';
};

/**
 * Check if a version can be regenerated.
 * Only versions in certain states can be regenerated.
 */
export const canRegenerate = (status: VersionStatus): boolean => {
  return status === 'draft' || status === 'script_ready' || status === 'failed';
};

/**
 * Check if a version is in a terminal state (complete or failed).
 */
export const isTerminalState = (status: VersionStatus): boolean => {
  return status === 'audio_ready' || status === 'failed';
};

/**
 * Check if a version is currently generating.
 */
export const isGenerating = (status: VersionStatus): boolean => {
  return GENERATING_STATES.includes(status);
};

/**
 * Get a human-readable description of a status.
 */
export const getStatusDescription = (status: VersionStatus): string => {
  const descriptions: Record<VersionStatus, string> = {
    draft: 'Draft - No script generated yet',
    script_ready: 'Script Ready - Awaiting audio generation',
    generating_audio: 'Generating Audio - Please wait',
    audio_ready: 'Complete - Audio is ready',
    failed: 'Failed - Generation encountered an error',
  };
  return descriptions[status] ?? 'Unknown status';
};
