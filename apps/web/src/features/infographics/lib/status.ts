import { InfographicStatus } from '@repo/api/contracts';
import type { BadgeVariant } from '@repo/ui/components/badge';

export { InfographicStatus };
export type InfographicStatusType =
  (typeof InfographicStatus)[keyof typeof InfographicStatus];

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

const STATUS_MAP: Record<InfographicStatusType, StatusConfig> = {
  [InfographicStatus.DRAFT]: {
    label: 'Draft',
    message: 'Ready to generate',
    badgeVariant: 'default',
  },
  [InfographicStatus.GENERATING]: {
    label: 'Generating',
    message: 'Generating infographic...',
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

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: InfographicStatusType | undefined,
): StatusConfig | undefined {
  return status ? STATUS_MAP[status] : undefined;
}

export function isGeneratingStatus(
  status: InfographicStatusType | undefined,
): boolean {
  return status === InfographicStatus.GENERATING;
}
