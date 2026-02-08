export type InfographicStatusType = 'draft' | 'generating' | 'ready' | 'failed';

interface StatusConfig {
  label: string;
  badgeVariant: 'default' | 'info' | 'warning' | 'success' | 'error' | 'purple';
}

const STATUS_MAP: Record<InfographicStatusType, StatusConfig> = {
  draft: { label: 'Draft', badgeVariant: 'default' },
  generating: { label: 'Generating', badgeVariant: 'info' },
  ready: { label: 'Ready', badgeVariant: 'success' },
  failed: { label: 'Failed', badgeVariant: 'error' },
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
  return status === 'generating';
}
