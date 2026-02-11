import { VoiceoverStatus } from '@repo/db/schema';
import type { BadgeVariant } from '@repo/ui/components/badge';

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

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: VoiceoverStatusType | undefined,
): StatusConfig | undefined {
  return status ? VOICEOVER_STATUS_CONFIG[status] : undefined;
}
