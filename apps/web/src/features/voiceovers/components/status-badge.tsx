import { Badge } from '@repo/ui/components/badge';
import { Spinner } from '@repo/ui/components/spinner';
import {
  type VoiceoverStatusType,
  getStatusConfig,
  isGeneratingStatus,
} from '../lib/status';

export function StatusBadge({
  status,
}: {
  status: VoiceoverStatusType | undefined;
}) {
  const config = getStatusConfig(status);
  if (!config) return null;

  return (
    <Badge variant={config.badgeVariant} className="gap-1.5">
      {isGeneratingStatus(status) && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}
