import { Badge } from '@repo/ui/components/badge';
import {
  type PodcastStatus,
  getStatusConfig,
} from '@/routes/_protected/podcasts/-constants/status';

export function StatusBadge({ status }: { status: PodcastStatus }) {
  const config = getStatusConfig(status);
  return <Badge variant={config.badgeVariant}>{config.label}</Badge>;
}
