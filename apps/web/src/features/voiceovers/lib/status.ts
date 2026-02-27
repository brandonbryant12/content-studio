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
const VOICEOVER_STATUS_CONFIG: Record<VoiceoverStatusType, StatusConfig> = {
  [VoiceoverStatus.DRAFTING]: {
    label: 'Draft',
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

/** Check if the quick start guide should be visible for a brand-new voiceover */
export function isQuickStartVisible(voiceover: {
  status: string;
  text: string;
  audioUrl: string | null;
}): boolean {
  return (
    voiceover.status === VoiceoverStatus.DRAFTING &&
    voiceover.text.trim().length === 0 &&
    voiceover.audioUrl === null
  );
}
