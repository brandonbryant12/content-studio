import { SourceStatus } from '@repo/api/contracts';
import type { BadgeVariant } from '@repo/ui/components/badge';

export { SourceStatus };
export type SourceStatusType = (typeof SourceStatus)[keyof typeof SourceStatus];

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

/**
 * Status flow: ready (default) → processing → ready | failed
 * Sources default to 'ready' (content available). Processing occurs during
 * upload/URL/research ingestion. 'ready' status is not displayed as a badge
 * since it is the default state.
 */
const SOURCE_STATUS_CONFIG: Record<SourceStatusType, StatusConfig> = {
  [SourceStatus.READY]: {
    label: 'Ready',
    message: 'Content is available',
    badgeVariant: 'success',
  },
  [SourceStatus.PROCESSING]: {
    label: 'Processing',
    message: 'Processing content...',
    badgeVariant: 'warning',
  },
  [SourceStatus.FAILED]: {
    label: 'Failed',
    message: 'Processing failed',
    badgeVariant: 'error',
  },
};

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: SourceStatusType | undefined,
): StatusConfig | undefined {
  return status ? SOURCE_STATUS_CONFIG[status] : undefined;
}
