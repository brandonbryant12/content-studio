import type { RouterOutput } from '@repo/api/client';
import type { BadgeVariant } from '@repo/ui/components/badge';

export type PodcastStatus = RouterOutput['podcasts']['get']['status'];

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

export const PODCAST_STATUS_CONFIG: Record<PodcastStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    message: 'Ready to generate',
    badgeVariant: 'default',
  },
  generating_script: {
    label: 'Writing Script',
    message: 'Writing your script...',
    badgeVariant: 'info',
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
  ready: {
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
export function isGeneratingStatus(status: PodcastStatus): boolean {
  return status === 'generating_script' || status === 'generating_audio';
}

/** Check if actions should be disabled (during generation or transitional states) */
export function isActionDisabled(status: PodcastStatus): boolean {
  return (
    status === 'generating_script' ||
    status === 'generating_audio'
  );
}

/** Get the status configuration for a given status */
export function getStatusConfig(status: PodcastStatus): StatusConfig {
  return PODCAST_STATUS_CONFIG[status];
}
