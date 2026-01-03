// features/podcasts/lib/status.ts

import {
  VersionStatus,
  type VersionStatus as VersionStatusType,
} from '@repo/db/schema';
import type { BadgeVariant } from '@repo/ui/components/badge';
import type { RouterOutput } from '@repo/api/client';

type PodcastFull = RouterOutput['podcasts']['get'];

// Re-export the VersionStatus const and type for convenience
export { VersionStatus };
export type { VersionStatusType };

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

/**
 * Status flow: drafting → generating_script → script_ready → generating_audio → ready
 */
export const VERSION_STATUS_CONFIG: Record<VersionStatusType, StatusConfig> = {
  [VersionStatus.DRAFTING]: {
    label: 'Drafting',
    message: 'Ready to generate',
    badgeVariant: 'default',
  },
  [VersionStatus.GENERATING_SCRIPT]: {
    label: 'Generating Script',
    message: 'Creating your script...',
    badgeVariant: 'purple',
  },
  [VersionStatus.SCRIPT_READY]: {
    label: 'Script Ready',
    message: 'Generating audio...',
    badgeVariant: 'warning',
  },
  [VersionStatus.GENERATING_AUDIO]: {
    label: 'Creating Audio',
    message: 'Synthesizing audio...',
    badgeVariant: 'purple',
  },
  [VersionStatus.READY]: {
    label: 'Ready',
    message: 'Your podcast is ready!',
    badgeVariant: 'success',
  },
  [VersionStatus.FAILED]: {
    label: 'Failed',
    message: 'Generation failed',
    badgeVariant: 'error',
  },
};

/** Check if a status indicates active generation (showing spinner/progress) */
export function isGeneratingStatus(
  status: VersionStatusType | undefined | null,
): boolean {
  return (
    status === VersionStatus.GENERATING_SCRIPT ||
    status === VersionStatus.SCRIPT_READY ||
    status === VersionStatus.GENERATING_AUDIO
  );
}

/** Check if actions should be disabled (during generation or transitional states) */
export function isActionDisabled(
  status: VersionStatusType | undefined,
): boolean {
  return (
    status === VersionStatus.GENERATING_SCRIPT ||
    status === VersionStatus.SCRIPT_READY ||
    status === VersionStatus.GENERATING_AUDIO
  );
}

/** Check if podcast is in ready state (can edit settings) */
export function isReadyStatus(status: VersionStatusType | undefined): boolean {
  return status === VersionStatus.READY;
}

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: VersionStatusType | undefined,
): StatusConfig | undefined {
  return status ? VERSION_STATUS_CONFIG[status] : undefined;
}

/**
 * Determine if the podcast is in setup mode (initial configuration).
 * A podcast is in setup mode if it's a brand new podcast that hasn't been configured yet:
 * - No documents linked
 * - No generation has ever been started (no generationContext)
 * - No script content yet
 * - Not currently generating (status is not a generating status)
 */
export function isSetupMode(podcast: PodcastFull): boolean {
  // Has documents been configured?
  const hasDocuments = podcast.documents.length > 0;
  // Has generation ever been started?
  const hasGenerationContext = podcast.generationContext !== null;
  // Has script content?
  const hasScript = Boolean(podcast.segments?.length);
  // Is currently generating? (optimistic update sets this before server responds)
  const isGenerating = isGeneratingStatus(podcast.status);

  // Show setup wizard only for completely unconfigured podcasts
  // Exit setup mode as soon as ANY of these conditions is true
  return !hasDocuments && !hasGenerationContext && !hasScript && !isGenerating;
}
