export { SetupWizard } from './setup-wizard';
export { StepIndicator } from './step-indicator';
export { SetupFooter } from './setup-footer';

// Helper function to determine if setup mode should be shown
import type { RouterOutput } from '@repo/api/client';

type PodcastFull = RouterOutput['podcasts']['get'];

/**
 * Determine if the podcast is in setup mode (initial configuration).
 * A podcast is in setup mode if it's a brand new podcast that hasn't been configured yet:
 * - No documents linked
 * - No generation has ever been started (no generationContext)
 * - No script content yet
 */
export function isSetupMode(podcast: PodcastFull): boolean {
  // Has documents been configured?
  const hasDocuments = podcast.documents.length > 0;
  // Has generation ever been started?
  const hasGenerationContext = podcast.generationContext !== null;
  // Has script content?
  const hasScript = Boolean(podcast.activeVersion?.segments?.length);

  // Show setup wizard only for completely unconfigured podcasts
  // Exit setup mode as soon as ANY of these conditions is true
  return !hasDocuments && !hasGenerationContext && !hasScript;
}
