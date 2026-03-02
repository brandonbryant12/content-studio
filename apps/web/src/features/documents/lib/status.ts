import { DocumentStatus } from '@repo/api/contracts';
import type { BadgeVariant } from '@repo/ui/components/badge';

export { DocumentStatus };
export type DocumentStatusType =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

interface StatusConfig {
  label: string;
  message: string;
  badgeVariant: BadgeVariant;
}

/**
 * Status flow: ready (default) → processing → ready | failed
 * Documents default to 'ready' (content available). Processing occurs during
 * upload/URL/research ingestion. 'ready' status is not displayed as a badge
 * since it is the default state.
 */
const DOCUMENT_STATUS_CONFIG: Record<DocumentStatusType, StatusConfig> = {
  [DocumentStatus.READY]: {
    label: 'Ready',
    message: 'Content is available',
    badgeVariant: 'success',
  },
  [DocumentStatus.PROCESSING]: {
    label: 'Processing',
    message: 'Processing content...',
    badgeVariant: 'warning',
  },
  [DocumentStatus.FAILED]: {
    label: 'Failed',
    message: 'Processing failed',
    badgeVariant: 'error',
  },
};

/** Get the status configuration for a given status */
export function getStatusConfig(
  status: DocumentStatusType | undefined,
): StatusConfig | undefined {
  return status ? DOCUMENT_STATUS_CONFIG[status] : undefined;
}
