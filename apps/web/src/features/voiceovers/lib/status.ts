// features/voiceovers/lib/status.ts

import { VoiceoverStatus } from '@repo/db/schema';
import type { BadgeVariant } from '@repo/ui/components/badge';

// Re-export the VoiceoverStatus const for convenience
export { VoiceoverStatus };
export type VoiceoverStatusType =
  (typeof VoiceoverStatus)[keyof typeof VoiceoverStatus];

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

/**
 * Status flow: drafting -> generating_audio -> ready
 */
export const VOICEOVER_STATUS_CONFIG: Record<
  VoiceoverStatusType,
  StatusConfig
> = {
  [VoiceoverStatus.DRAFTING]: {
    label: 'Drafting',
    message: 'Ready to generate',
    badgeVariant: 'default',
  },
  [VoiceoverStatus.GENERATING_AUDIO]: {
    label: 'Generating Audio',
    message: 'Synthesizing audio...',
    badgeVariant: 'purple',
  },
  [VoiceoverStatus.READY]: {
    label: 'Ready',
    message: 'Your voiceover is ready!',
    badgeVariant: 'success',
  },
  [VoiceoverStatus.FAILED]: {
    label: 'Failed',
    message: 'Generation failed',
    badgeVariant: 'error',
  },
};

/** Check if a status indicates active generation (showing spinner/progress) */
export function isGeneratingStatus(
  status: VoiceoverStatusType | undefined | null,
): boolean {
  return status === VoiceoverStatus.GENERATING_AUDIO;
}

/** Check if actions should be disabled (during generation) */
export function isActionDisabled(
  status: VoiceoverStatusType | undefined,
): boolean {
  return status === VoiceoverStatus.GENERATING_AUDIO;
}

/** Check if voiceover is in ready state (can edit settings) */
export function isReadyStatus(
  status: VoiceoverStatusType | undefined,
): boolean {
  return status === VoiceoverStatus.READY;
}

/** Check if voiceover can be edited (drafting, ready, or failed) */
export function canEdit(status: VoiceoverStatusType | undefined): boolean {
  return (
    status === VoiceoverStatus.DRAFTING ||
    status === VoiceoverStatus.READY ||
    status === VoiceoverStatus.FAILED
  );
}

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: VoiceoverStatusType | undefined,
): StatusConfig | undefined {
  return status ? VOICEOVER_STATUS_CONFIG[status] : undefined;
}
