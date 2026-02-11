import type { RouterOutput } from '@repo/api/client';
import { SetupWizard } from './setup';

type Podcast = RouterOutput['podcasts']['get'];

interface SetupWizardContainerProps {
  podcast: Podcast;
}

/**
 * Container for the setup wizard.
 * Currently a thin wrapper, but provides a place for future
 * extraction of state management if needed.
 */
export function SetupWizardContainer({ podcast }: SetupWizardContainerProps) {
  return <SetupWizard podcast={podcast} />;
}
