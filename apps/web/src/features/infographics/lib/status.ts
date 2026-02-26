import { InfographicStatus } from '@repo/db/schema';

export { InfographicStatus };
export type InfographicStatusType =
  (typeof InfographicStatus)[keyof typeof InfographicStatus];

interface StatusConfig {
  label: string;
  badgeVariant: 'default' | 'info' | 'warning' | 'success' | 'error' | 'purple';
}

const STATUS_MAP: Record<InfographicStatusType, StatusConfig> = {
  [InfographicStatus.DRAFT]: { label: 'Draft', badgeVariant: 'default' },
  [InfographicStatus.GENERATING]: { label: 'Generating', badgeVariant: 'purple' },
  [InfographicStatus.READY]: { label: 'Ready', badgeVariant: 'success' },
  [InfographicStatus.FAILED]: { label: 'Failed', badgeVariant: 'error' },
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
