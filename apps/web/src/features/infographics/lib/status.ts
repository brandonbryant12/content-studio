import { InfographicStatus } from '@repo/db/schema';

export { InfographicStatus };
export type InfographicStatusType =
  (typeof InfographicStatus)[keyof typeof InfographicStatus];

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: 'default' | 'info' | 'warning' | 'success' | 'error' | 'purple';
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

export function getStatusConfig(
  status: InfographicStatusType | undefined,
): StatusConfig | null {
  if (!status) return null;
  return STATUS_MAP[status] ?? null;
}

export function isGeneratingStatus(
  status: InfographicStatusType | undefined,
): boolean {
  return status === InfographicStatus.GENERATING;
}
