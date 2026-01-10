// features/infographics/lib/status.ts

import {
  InfographicStatus,
  type InfographicStatus as InfographicStatusType,
} from '@repo/db/schema';
import type { BadgeVariant } from '@repo/ui/components/badge';

// Re-export the InfographicStatus const and type for convenience
export { InfographicStatus };
export type { InfographicStatusType };

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

/**
 * Status flow: drafting -> generating -> ready
 */
export const INFOGRAPHIC_STATUS_CONFIG: Record<
  InfographicStatusType,
  StatusConfig
> = {
  [InfographicStatus.DRAFTING]: {
    label: 'Drafting',
    message: 'Ready to generate',
    badgeVariant: 'default',
  },
  [InfographicStatus.GENERATING]: {
    label: 'Generating',
    message: 'Creating your infographic...',
    badgeVariant: 'purple',
  },
  [InfographicStatus.READY]: {
    label: 'Ready',
    message: 'Your infographic is ready!',
    badgeVariant: 'success',
  },
  [InfographicStatus.FAILED]: {
    label: 'Failed',
    message: 'Generation failed',
    badgeVariant: 'error',
  },
};

/** Check if a status indicates active generation (showing spinner/progress) */
export function isGeneratingStatus(
  status: InfographicStatusType | undefined | null,
): boolean {
  return status === InfographicStatus.GENERATING;
}

/** Check if actions should be disabled (during generation) */
export function isActionDisabled(
  status: InfographicStatusType | undefined,
): boolean {
  return status === InfographicStatus.GENERATING;
}

/** Check if infographic is in ready state */
export function isReadyStatus(
  status: InfographicStatusType | undefined,
): boolean {
  return status === InfographicStatus.READY;
}

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: InfographicStatusType | undefined,
): StatusConfig | undefined {
  return status ? INFOGRAPHIC_STATUS_CONFIG[status] : undefined;
}
