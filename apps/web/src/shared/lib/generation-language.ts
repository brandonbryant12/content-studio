/**
 * Shared generation language constants for consistent UX across all workbench surfaces.
 * Each surface (podcasts, voiceovers, infographics) references these for CTAs, badges, and messages.
 */

export const GENERATION_LABELS = {
  // CTA buttons
  generate: 'Generate',
  regenerate: 'Regenerate',
  saveAndRegenerate: 'Save & Regenerate',
  retry: 'Retry',
  saving: 'Saving...',

  // Status bar messages
  statusDraft: 'Draft',
  statusGenerating: 'Generating',
  statusReady: 'Ready',
  statusFailed: 'Generation failed',
  statusUnsavedChanges: 'Unsaved changes',

  // Badge labels
  badgeDraft: 'Draft',
  badgeGenerating: 'Generating',
  badgeReady: 'Ready',
  badgeFailed: 'Failed',

  // Progress / toast
  generationStarted: 'Generation started',
  failedToStartGeneration: 'Failed to start generation',
  generationFailed: 'Generation failed',
  subtitle: 'This may take a minute',
} as const;

/**
 * Interpolate a generation label template with an object name.
 * @example generationLabel('Generate {object}', { object: 'Podcast' }) // 'Generate Podcast'
 */
export function generationLabel(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}
