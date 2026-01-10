// features/infographics/components/infographic-item.tsx

import { TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import {
  type InfographicStatusType,
  getStatusConfig,
  isGeneratingStatus,
} from '../lib/status';
import { InfographicIcon } from './infographic-icon';

/**
 * Infographic type display names.
 * Matches INFOGRAPHIC_TYPES from @repo/media.
 */
const INFOGRAPHIC_TYPE_NAMES: Record<string, string> = {
  timeline: 'Timeline',
  comparison: 'Comparison',
  statistical: 'Statistical',
  process: 'Process Flow',
  list: 'List',
  mindMap: 'Mind Map',
  hierarchy: 'Hierarchy',
  geographic: 'Geographic',
};

/** Infographic data for list display */
export interface InfographicListItem {
  id: string;
  title: string;
  infographicType: string;
  status: InfographicStatusType;
  aspectRatio: string;
  imageUrl: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: InfographicStatusType | undefined }) {
  const config = getStatusConfig(status);
  if (!config) return null;

  return (
    <Badge variant={config.badgeVariant} className="gap-1.5">
      {isGeneratingStatus(status) && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

function TypeBadge({ infographicType }: { infographicType: string }) {
  const displayName = INFOGRAPHIC_TYPE_NAMES[infographicType] ?? infographicType;

  return <Badge variant="default">{displayName}</Badge>;
}

export interface InfographicItemProps {
  infographic: InfographicListItem;
  onDelete: () => void;
  isDeleting: boolean;
}

export function InfographicItem({
  infographic,
  onDelete,
  isDeleting,
}: InfographicItemProps) {
  return (
    <div className="list-card group overflow-hidden">
      <Link
        to="/infographics/$infographicId"
        params={{ infographicId: infographic.id }}
        className="flex items-start gap-4 flex-1"
      >
        <InfographicIcon
          infographicType={infographic.infographicType}
          status={infographic.status}
        />
        <div className="flex-1 min-w-0">
          <h3 className="list-card-title">{infographic.title}</h3>
          <div className="list-card-meta gap-2 flex-wrap">
            <StatusBadge status={infographic.status} />
            <TypeBadge infographicType={infographic.infographicType} />
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-meta">
          {new Date(infographic.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="btn-delete"
        >
          {isDeleting ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
