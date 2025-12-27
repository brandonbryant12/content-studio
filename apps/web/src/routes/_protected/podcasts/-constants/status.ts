import type { RouterOutput } from '@repo/api/client';
import type { BadgeVariant } from '@repo/ui/components/badge';

// Version-level status (status is on activeVersion, not podcast)
export type VersionStatus = NonNullable<
  RouterOutput['podcasts']['get']['activeVersion']
>['status'];

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

export const VERSION_STATUS_CONFIG: Record<VersionStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    message: 'Ready to generate',
    badgeVariant: 'default',
  },
  script_ready: {
    label: 'Script Ready',
    message: 'Ready to generate audio',
    badgeVariant: 'warning',
  },
  generating_audio: {
    label: 'Creating Audio',
    message: 'Synthesizing audio...',
    badgeVariant: 'purple',
  },
  audio_ready: {
    label: 'Ready',
    message: 'Your podcast is ready to play!',
    badgeVariant: 'success',
  },
  failed: {
    label: 'Failed',
    message: 'Generation failed',
    badgeVariant: 'error',
  },
};

/** Check if a status indicates active generation (showing spinner/progress) */
export function isGeneratingStatus(status: VersionStatus | undefined): boolean {
  return status === 'draft' || status === 'generating_audio';
}

/** Check if actions should be disabled (during generation or transitional states) */
export function isActionDisabled(status: VersionStatus | undefined): boolean {
  return status === 'draft' || status === 'generating_audio';
}

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: VersionStatus | undefined,
): StatusConfig | undefined {
  return status ? VERSION_STATUS_CONFIG[status] : undefined;
}
