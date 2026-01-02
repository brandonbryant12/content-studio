// features/podcasts/lib/status.ts

import type { VersionStatus as DbVersionStatus } from '@repo/db/schema';
import type { BadgeVariant } from '@repo/ui/components/badge';
import type { RouterOutput } from '@repo/api/client';

type PodcastFull = RouterOutput['podcasts']['get'];

// Version-level status (status is on activeVersion, not podcast)
export type VersionStatus = DbVersionStatus;

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

/**
 * Status flow: drafting → generating_script → script_ready → generating_audio → ready
 */
export const VERSION_STATUS_CONFIG: Record<VersionStatus, StatusConfig> = {
  drafting: {
    label: 'Drafting',
    message: 'Ready to generate',
    badgeVariant: 'default',
  },
  generating_script: {
    label: 'Generating Script',
    message: 'Creating your script...',
    badgeVariant: 'purple',
  },
  script_ready: {
    label: 'Script Ready',
    message: 'Generating audio...',
    badgeVariant: 'warning',
  },
  generating_audio: {
    label: 'Creating Audio',
    message: 'Synthesizing audio...',
    badgeVariant: 'purple',
  },
  ready: {
    label: 'Ready',
    message: 'Your podcast is ready!',
    badgeVariant: 'success',
  },
  failed: {
    label: 'Failed',
    message: 'Generation failed',
    badgeVariant: 'error',
  },
};

/** Check if a status indicates active generation (showing spinner/progress) */
export function isGeneratingStatus(status: VersionStatus | undefined | null): boolean {
  return (
    status === 'drafting' ||
    status === 'generating_script' ||
    status === 'script_ready' ||
    status === 'generating_audio'
  );
}

/** Check if actions should be disabled (during generation or transitional states) */
export function isActionDisabled(status: VersionStatus | undefined): boolean {
  return (
    status === 'drafting' ||
    status === 'generating_script' ||
    status === 'script_ready' ||
    status === 'generating_audio'
  );
}

/** Check if podcast is in ready state (can edit settings) */
export function isReadyStatus(status: VersionStatus | undefined): boolean {
  return status === 'ready';
}

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: VersionStatus | undefined,
): StatusConfig | undefined {
  return status ? VERSION_STATUS_CONFIG[status] : undefined;
}

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
