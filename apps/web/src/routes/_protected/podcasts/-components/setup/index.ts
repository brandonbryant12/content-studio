export { SetupWizard } from './setup-wizard';
export { StepIndicator } from './step-indicator';
export { SetupFooter } from './setup-footer';

// Helper function to determine if setup mode should be shown
import type { RouterOutput } from '@repo/api/client';

type PodcastFull = RouterOutput['podcasts']['get'];

export function isSetupMode(podcast: PodcastFull): boolean {
  return (
    podcast.status === 'draft' &&
    podcast.documents.length === 0 &&
    !podcast.script
  );
}
