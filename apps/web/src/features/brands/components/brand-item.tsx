// features/brands/components/brand-item.tsx

import { TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback } from 'react';
import { BrandIcon } from './brand-icon';

/** Brand data for list display */
export interface BrandListItem {
  id: string;
  name: string;
  description: string | null;
  mission: string | null;
  values: readonly string[];
  colors: {
    primary: string;
    secondary?: string | null;
    accent?: string | null;
  } | null;
  personaCount: number;
  segmentCount: number;
  createdAt: string;
}

export interface BrandItemProps {
  brand: BrandListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

// Memoized to prevent re-renders when parent list re-renders
export const BrandItem = memo(function BrandItem({
  brand,
  onDelete,
  isDeleting,
}: BrandItemProps) {
  // Stable callback - calls parent with id
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(brand.id);
    },
    [onDelete, brand.id],
  );

  return (
    <div className="list-card group overflow-hidden">
      <Link
        to="/brands/$brandId"
        params={{ brandId: brand.id }}
        search={{ step: undefined }}
        className="flex items-start gap-4 flex-1"
      >
        <BrandIcon colors={brand.colors} />
        <div className="flex-1 min-w-0">
          <h3 className="list-card-title">{brand.name}</h3>
          <div className="list-card-meta gap-2 flex-wrap">
            <Badge variant="default">
              {brand.personaCount > 0
                ? `${brand.personaCount} persona${brand.personaCount !== 1 ? 's' : ''}`
                : 'No personas'}
            </Badge>
            <Badge variant="default">
              {brand.segmentCount > 0
                ? `${brand.segmentCount} segment${brand.segmentCount !== 1 ? 's' : ''}`
                : 'No segments'}
            </Badge>
            <span className="text-meta">
              {brand.values.length > 0
                ? `${brand.values.length} values`
                : 'No values'}
            </span>
          </div>
          {brand.description && (
            <p className="text-body mt-2 line-clamp-1">{brand.description}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-meta">
          {new Date(brand.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
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
});
